import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, Text } from "react-native";

const Stack = createNativeStackNavigator();

function HomeScreen() {
  return (
    <View style={{ flex:1, justifyContent:"center", alignItems:"center" }}>
      <Text>AI Expense Tracker</Text>
    </View>
  );
}

export default function Navigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: "AI Expense Tracker" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}