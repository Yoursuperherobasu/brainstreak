import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, FontSize } from '@/constants/theme';

interface SectionHeaderProps {
  title: string;
  accessory?: { label: string; onPress: () => void };
  marginTop?: number;
}

export function SectionHeader({ title, accessory, marginTop }: SectionHeaderProps) {
  return (
    <View style={[styles.row, marginTop !== undefined && { marginTop }]}>
      <Text style={styles.title}>{title}</Text>
      {accessory && (
        <TouchableOpacity onPress={accessory.onPress}>
          <Text style={styles.accessory}>{accessory.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  title: {
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
  },
  accessory: {
    fontSize: FontSize.sm,
    color: Colors.primaryLight,
    fontFamily: 'Inter_600SemiBold',
  },
});
