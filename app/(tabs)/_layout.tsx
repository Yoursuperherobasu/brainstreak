import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius } from '@/constants/theme';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={[styles.tab, focused && styles.tabActive]}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.tabLabel, { color: focused ? Colors.primaryLight : Colors.textMuted }]}>
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="play"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🎮" label="Play" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏆" label="Ranks" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="✅" label="Habits" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: 72,
    paddingBottom: 8,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    gap: 2,
  },
  tabActive: {
    backgroundColor: `${Colors.primary}20`,
  },
  emoji: {
    fontSize: 22,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});
