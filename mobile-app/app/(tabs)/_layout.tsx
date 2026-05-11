import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { useAuth } from '../../context/AuthContext';

export default function TabLayout() {
  const { user, initializing } = useAuth();

  if (initializing) return null;
  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#10B981',
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={24} name={focused ? 'home' : 'home-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="advice"
        options={{
          title: 'Asistan',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={24} name={focused ? 'bulb' : 'bulb-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Analiz',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={24} name={focused ? 'stats-chart' : 'bar-chart-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="devices"
        options={{
          title: 'Cihazlar',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={24} name={focused ? 'hardware-chip' : 'hardware-chip-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={24} name={focused ? 'person' : 'person-outline'} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
