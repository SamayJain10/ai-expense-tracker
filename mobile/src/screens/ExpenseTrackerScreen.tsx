import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  ActivityIndicator,
  Alert,
  FlatList,
  PanResponder,
  Platform,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import axios from "axios";
import { API_BASE_URL } from "../config/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Expense {
  id: number;
  amount: number;
  currency: string;
  category: string;
  description: string;
  merchant: string | null;
  created_at: string;
}

// ─── Theme ────────────────────────────────────────────────────────────────────

const LIGHT = {
  bg:           "#FAFAFA",
  surface:      "#FFFFFF",
  border:       "#F0F0F0",
  title:        "#1A1A2E",
  body:         "#444444",
  subtle:       "#777777",
  muted:        "#AAAAAA",
  placeholder:  "#BBBBBB",
  accent:       "#6C63FF",
  accentMuted:  "#C4C1F7",
  success:      "#F0FFF6",
  successBorder:"#6EE7A0",
  successTitle: "#15803D",
  deleteCircle: "#FEE2E2",
  deleteText:   "#EF4444",
  toggleBg:     "#EFEFEF",
  toggleKnob:   "#FFFFFF",
  sectionText:  "#AAAAAA",
};

const DARK = {
  bg:           "#0F0F14",
  surface:      "#1C1C26",
  border:       "#2A2A38",
  title:        "#EAEAF5",
  body:         "#C8C8DC",
  subtle:       "#8888AA",
  muted:        "#55556A",
  placeholder:  "#44445A",
  accent:       "#7C75FF",
  accentMuted:  "#3D3980",
  success:      "#0D2B1A",
  successBorder:"#2D6A4A",
  successTitle: "#4ADE80",
  deleteCircle: "#3B1515",
  deleteText:   "#F87171",
  toggleBg:     "#2A2A38",
  toggleKnob:   "#7C75FF",
  sectionText:  "#55556A",
};

type Theme = typeof LIGHT;

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  "Food & Dining":    "🍔",
  Transport:          "🚗",
  Shopping:           "🛒",
  Entertainment:      "📺",
  "Bills & Utilities":"📄",
  Health:             "💊",
  Travel:             "✈️",
  Other:              "📦",
};

const CATEGORY_COLOR_LIGHT: Record<string, string> = {
  "Food & Dining":    "#FFF3E0",
  Transport:          "#E3F2FD",
  Shopping:           "#FCE4EC",
  Entertainment:      "#F3E5F5",
  "Bills & Utilities":"#E8F5E9",
  Health:             "#E0F7FA",
  Travel:             "#FFF8E1",
  Other:              "#F5F5F5",
};

const CATEGORY_COLOR_DARK: Record<string, string> = {
  "Food & Dining":    "#2B1F0A",
  Transport:          "#0A1929",
  Shopping:           "#2B0A14",
  Entertainment:      "#1A0A2B",
  "Bills & Utilities":"#0A1F0A",
  Health:             "#0A1F24",
  Travel:             "#2B2410",
  Other:              "#1A1A26",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60)    return "Just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatAmount(amount: number, currency = "INR") {
  return `${currency === "INR" ? "₹" : currency + " "}${amount.toLocaleString("en-IN")}`;
}

// ─── Theme Toggle ─────────────────────────────────────────────────────────────

const ThemeToggle = ({ dark, onToggle }: { dark: boolean; onToggle: () => void }) => {
  const anim = useRef(new Animated.Value(dark ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, { toValue: dark ? 1 : 0, useNativeDriver: true, bounciness: 4 }).start();
  }, [dark]);

  const knobX = anim.interpolate({ inputRange: [0, 1], outputRange: [2, 22] });
  const t = dark ? DARK : LIGHT;

  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.8}>
      <View style={[tt.track, { backgroundColor: t.toggleBg }]}>
        <Text style={tt.icon}>{dark ? "🌙" : "☀️"}</Text>
        <Animated.View style={[tt.knob, { backgroundColor: t.toggleKnob, transform: [{ translateX: knobX }] }]} />
      </View>
    </TouchableOpacity>
  );
};

const tt = StyleSheet.create({
  track:  { width: 52, height: 28, borderRadius: 14, justifyContent: "center", paddingHorizontal: 2 },
  knob:   { position: "absolute", width: 22, height: 22, borderRadius: 11, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 },
  icon:   { position: "absolute", right: 6, fontSize: 12 },
});

// ─── Expense Card ─────────────────────────────────────────────────────────────

const SWIPE_THRESHOLD = -72; // how far left to reveal the action
const DELETE_TRIGGER  = -110; // swipe past this → auto-delete

const ExpenseCard = ({ item, onDelete, t, dark }: { item: Expense; onDelete: (id: number) => void; t: Theme; dark: boolean }) => {
  const bgMap   = dark ? CATEGORY_COLOR_DARK : CATEGORY_COLOR_LIGHT;
  const bgColor = bgMap[item.category] ?? (dark ? "#1A1A26" : "#F5F5F5");

  const translateX  = useRef(new Animated.Value(0)).current;
  const rowHeight   = useRef(new Animated.Value(1)).current;  // scale for collapse
  const deleteScale = useRef(new Animated.Value(1)).current;

  // Bounce the row back to 0
  const snapBack = () =>
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 8 }).start();

  // Collapse row then call onDelete
  const collapseAndDelete = () => {
    Animated.parallel([
      Animated.timing(translateX, { toValue: -500, duration: 220, useNativeDriver: true }),
      Animated.timing(rowHeight,  { toValue: 0,    duration: 260, useNativeDriver: false }),
    ]).start(() => onDelete(item.id));
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        // Only allow leftward swipe
        if (g.dx > 0) return;
        translateX.setValue(g.dx);
        // Scale up the delete background icon as user swipes further
        const progress = Math.min(Math.abs(g.dx) / Math.abs(DELETE_TRIGGER), 1);
        deleteScale.setValue(0.8 + progress * 0.4);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < DELETE_TRIGGER) {
          // Swiped far enough — trigger delete
          collapseAndDelete();
        } else if (g.dx < SWIPE_THRESHOLD) {
          // Partial swipe — snap to reveal the delete zone
          Animated.spring(translateX, { toValue: SWIPE_THRESHOLD, useNativeDriver: true, bounciness: 6 }).start();
        } else {
          snapBack();
        }
      },
      onPanResponderTerminate: snapBack,
    })
  ).current;

  const confirmDelete = () =>
    Alert.alert("Delete Expense", "Remove this expense?", [
      { text: "Cancel", style: "cancel", onPress: snapBack },
      { text: "Delete", style: "destructive", onPress: collapseAndDelete },
    ]);

  // Red bg opacity: starts fading in as soon as user starts swiping
  const redOpacity = translateX.interpolate({
    inputRange: [DELETE_TRIGGER, SWIPE_THRESHOLD, 0],
    outputRange: [1, 0.85, 0],
    extrapolate: "clamp",
  });

  return (
    <Animated.View style={{ height: rowHeight.interpolate({ inputRange: [0, 1], outputRange: [0, 82] }), overflow: "hidden", marginHorizontal: 16, marginBottom: 10 }}>
      {/* Delete backdrop */}
      <Animated.View style={[cs.deleteBg, { opacity: redOpacity }]}>
        <Animated.Text style={[cs.deleteBgIcon, { transform: [{ scale: deleteScale }] }]}>🗑️</Animated.Text>
        <Text style={cs.deleteBgText}>Delete</Text>
      </Animated.View>

      {/* Swipeable row */}
      <Animated.View
        style={[cs.card, { backgroundColor: t.surface, transform: [{ translateX }] }, shadow(dark)]}
        {...panResponder.panHandlers}
      >
        <View style={[cs.badge, { backgroundColor: bgColor }]}>
          <Text style={cs.badgeEmoji}>{CATEGORY_EMOJI[item.category] ?? "📦"}</Text>
        </View>
        <View style={cs.cardBody}>
          <Text style={[cs.cardCategory, { color: t.title }]}>{item.category}</Text>
          <Text style={[cs.cardDesc, { color: t.subtle }]} numberOfLines={1}>{item.description}</Text>
          {item.merchant && <Text style={[cs.cardMerchant, { color: t.muted }]} numberOfLines={1}>@ {item.merchant}</Text>}
          <Text style={[cs.cardTime, { color: t.muted }]}>{timeAgo(item.created_at)}</Text>
        </View>
        <View style={cs.cardRight}>
          <Text style={[cs.cardAmount, { color: t.title }]}>{formatAmount(item.amount, item.currency)}</Text>
          <TouchableOpacity onPress={confirmDelete} style={[cs.deleteBtn, { backgroundColor: t.deleteCircle }]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[cs.deleteIcon, { color: t.deleteText }]}>✕</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const cs = StyleSheet.create({
  card:         { flexDirection: "row", alignItems: "center", borderRadius: 16, padding: 14, gap: 12 },
  deleteBg:     { position: "absolute", right: 0, top: 0, bottom: 0, left: 0, backgroundColor: "#EF4444", borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", paddingRight: 20, gap: 6 },
  deleteBgIcon: { fontSize: 20 },
  deleteBgText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  badge:        { width: 46, height: 46, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  badgeEmoji:   { fontSize: 22 },
  cardBody:     { flex: 1, gap: 2 },
  cardCategory: { fontSize: 13, fontWeight: "700" },
  cardDesc:     { fontSize: 12 },
  cardMerchant: { fontSize: 11 },
  cardTime:     { fontSize: 11, marginTop: 2 },
  cardRight:    { alignItems: "flex-end", gap: 8 },
  cardAmount:   { fontSize: 15, fontWeight: "800" },
  deleteBtn:    { width: 22, height: 22, borderRadius: 11, justifyContent: "center", alignItems: "center" },
  deleteIcon:   { fontSize: 9, fontWeight: "700" },
});

// ─── Success Card ─────────────────────────────────────────────────────────────

const SuccessCard = ({ expense, t }: { expense: Expense; t: Theme }) => {
  const translateY = useRef(new Animated.Value(-10)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const rows: [string, string][] = [
    ["Amount",      formatAmount(expense.amount, expense.currency)],
    ["Category",    `${CATEGORY_EMOJI[expense.category] ?? "📦"} ${expense.category}`],
    ["Description", expense.description],
    ...(expense.merchant ? [["Merchant", expense.merchant] as [string, string]] : []),
  ];

  return (
    <Animated.View style={[sc.card, { backgroundColor: t.success, borderColor: t.successBorder, opacity, transform: [{ translateY }] }]}>
      <View style={sc.header}>
        <Text style={sc.icon}>✅</Text>
        <Text style={[sc.title, { color: t.successTitle }]}>Expense Added!</Text>
      </View>
      {rows.map(([label, value]) => (
        <View key={label} style={sc.row}>
          <Text style={[sc.label, { color: t.subtle }]}>{label}</Text>
          <Text style={[sc.value, { color: t.title }]} numberOfLines={1}>{value}</Text>
        </View>
      ))}
    </Animated.View>
  );
};

const sc = StyleSheet.create({
  card:   { marginHorizontal: 16, marginBottom: 16, borderRadius: 16, padding: 16, borderWidth: 1.5 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 },
  icon:   { fontSize: 18 },
  title:  { fontSize: 15, fontWeight: "700" },
  row:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 5 },
  label:  { fontSize: 12, flex: 1 },
  value:  { fontSize: 13, fontWeight: "600", flex: 2, textAlign: "right" },
});

// ─── Shadow helper ────────────────────────────────────────────────────────────

function shadow(dark: boolean) {
  if (Platform.OS === "android") return { elevation: dark ? 6 : 3 };
  return {
    shadowColor: dark ? "#000" : "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: dark ? 0.4 : 0.06,
    shadowRadius: 8,
  };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ExpenseTrackerScreen() {
  const [dark,           setDark]           = useState(false);
  const [input,          setInput]          = useState("");
  const [expenses,       setExpenses]       = useState<Expense[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [refreshing,     setRefreshing]     = useState(false);
  const [successExpense, setSuccessExpense] = useState<Expense | null>(null);

  const t = dark ? DARK : LIGHT;

  const fetchExpenses = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/expenses`);
      setExpenses(res.data.data);
    } catch {
      Alert.alert("Error", "Failed to load expenses. Is the server running?");
    }
  };

  useEffect(() => { fetchExpenses(); }, []);

  const handleAdd = async () => {
    const text = input.trim();
    if (!text) return;
    setLoading(true);
    try {
      const res     = await axios.post(`${API_BASE_URL}/api/expenses`, { input: text });
      const expense = res.data.data as Expense;
      setInput("");
      setExpenses(prev => [expense, ...prev]);
      setSuccessExpense(expense);
      setTimeout(() => setSuccessExpense(null), 3000);
    } catch (err: any) {
      Alert.alert("Could Not Add", err?.response?.data?.error ?? "Failed to parse expense.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    try {
      await axios.delete(`${API_BASE_URL}/api/expenses/${id}`);
    } catch {
      Alert.alert("Error", "Failed to delete. Please refresh.");
      fetchExpenses();
    }
  };

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <SafeAreaView style={[ms.safe, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={dark ? "light-content" : "dark-content"} backgroundColor={t.bg} />

      <FlatList
        data={expenses}
        keyExtractor={e => String(e.id)}
        contentContainerStyle={ms.listContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetchExpenses(); setRefreshing(false); }} tintColor={t.accent} />}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={ms.header}>
              <View>
                <Text style={[ms.title, { color: t.title }]}>AI Expense Tracker</Text>
                <Text style={[ms.subtitle, { color: t.muted }]}>Add expenses in plain English</Text>
              </View>
              <View style={ms.headerRight}>
                {expenses.length > 0 && (
                  <View style={[ms.totalBadge, { backgroundColor: t.accent }]}>
                    <Text style={ms.totalLabel}>Total</Text>
                    <Text style={ms.totalAmount}>{formatAmount(totalSpent)}</Text>
                  </View>
                )}
                <ThemeToggle dark={dark} onToggle={() => setDark(d => !d)} />
              </View>
            </View>

            {/* Input */}
            <View style={[ms.inputCard, { backgroundColor: t.surface }, shadow(dark)]}>
              <TextInput
                style={[ms.input, { color: t.title }]}
                placeholder="e.g., Spent 500 on groceries at BigBazaar"
                placeholderTextColor={t.placeholder}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={handleAdd}
                returnKeyType="done"
                editable={!loading}
              />
              <TouchableOpacity
                style={[ms.addBtn, { backgroundColor: (!input.trim() || loading) ? t.accentMuted : t.accent }]}
                onPress={handleAdd}
                disabled={!input.trim() || loading}
                activeOpacity={0.8}
              >
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={ms.addBtnText}>Add</Text>}
              </TouchableOpacity>
            </View>

            {/* Success */}
            {successExpense && <SuccessCard expense={successExpense} t={t} />}

            {/* Section label */}
            {expenses.length > 0 && (
            <View style={ms.sectionContainer}>
              <View style={ms.sectionRow}>
                <Text style={[ms.sectionTitle, { color: t.sectionText }]}>RECENT EXPENSES</Text>
                <Text style={[ms.sectionCount, { color: t.muted }]}>{expenses.length} item{expenses.length !== 1 ? "s" : ""}</Text>
                <Text style={[ms.sectionTip, { color: t.muted }]}>← Swipe an expense to delete</Text>
              </View>
            </View>  
              
            )}
          </>
        }
        renderItem={({ item }) => (
          <ExpenseCard item={item} onDelete={handleDelete} t={t} dark={dark} />
        )}
        ListEmptyComponent={
          <View style={ms.empty}>
            <Text style={ms.emptyEmoji}>💸</Text>
            <Text style={[ms.emptyHeading, { color: t.body }]}>No expenses yet</Text>
            <Text style={[ms.emptyHint, { color: t.muted }]}>Add your first one above!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ─── Main Styles ──────────────────────────────────────────────────────────────

const ms = StyleSheet.create({
  safe:        { flex: 1 },
  listContent: { paddingBottom: 48 },
  header:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20 },
  headerRight: { alignItems: "flex-end", gap: 8 },
  title:       { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  subtitle:    { fontSize: 13, marginTop: 3 },
  totalBadge:  { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, alignItems: "flex-end" },
  totalLabel:  { color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  totalAmount: { color: "#fff", fontSize: 16, fontWeight: "700", marginTop: 2 },
  inputCard:   { flexDirection: "row", marginHorizontal: 16, marginBottom: 16, borderRadius: 16, padding: 10, gap: 8 },
  input:       { flex: 1, fontSize: 14, paddingHorizontal: 8, paddingVertical: 6 },
  addBtn:      { borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, justifyContent: "center", alignItems: "center", minWidth: 68 },
  addBtnText:  { color: "#fff", fontWeight: "700", fontSize: 14 },
  sectionContainer: {marginHorizontal: 5,marginBottom: 10,marginTop: 4,},
  sectionRow:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 20, marginBottom: 10, marginTop: 4 },
  sectionTitle:{ fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  sectionCount:{ fontSize: 11 },
  sectionTip:  { fontSize: 10, fontStyle: "italic" },
  empty:       { alignItems: "center", paddingTop: 64 },
  emptyEmoji:  { fontSize: 52, marginBottom: 16 },
  emptyHeading:{ fontSize: 17, fontWeight: "700" },
  emptyHint:   { fontSize: 13, marginTop: 6 },
});