import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import { haptics } from '@/lib/haptics';

interface BaseProps {
  emoji: string;
  label: string;
  description?: string;
}

interface ToggleRowProps extends BaseProps {
  kind: 'toggle';
  value: boolean;
  onChange: (next: boolean) => void;
}

interface NavRowProps extends BaseProps {
  kind: 'nav';
  rightLabel?: string;
  onPress: () => void;
}

interface ValueRowProps extends BaseProps {
  kind: 'value';
  value: string;
}

type SettingsRowProps = ToggleRowProps | NavRowProps | ValueRowProps;

export function SettingsRow(props: SettingsRowProps) {
  const inner = (
    <View style={styles.row}>
      <Text style={styles.emoji}>{props.emoji}</Text>
      <View style={styles.textCol}>
        <Text style={styles.label}>{props.label}</Text>
        {props.description && <Text style={styles.description}>{props.description}</Text>}
      </View>
      {props.kind === 'toggle' && (
        <Switch
          value={props.value}
          onValueChange={(v) => {
            haptics.selection();
            props.onChange(v);
          }}
          trackColor={{ false: Colors.bgOverlay, true: Colors.primary }}
          thumbColor={props.value ? Colors.primaryLight : Colors.textMuted}
        />
      )}
      {props.kind === 'nav' && (
        <Text style={styles.navAccessory}>
          {props.rightLabel ? `${props.rightLabel}  ` : ''}›
        </Text>
      )}
      {props.kind === 'value' && <Text style={styles.value}>{props.value}</Text>}
    </View>
  );

  if (props.kind === 'nav') {
    return (
      <TouchableOpacity onPress={props.onPress} activeOpacity={0.7}>
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  emoji: { fontSize: 22, width: 28 },
  textCol: { flex: 1, gap: 2 },
  label: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  description: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  navAccessory: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    fontFamily: 'BricolageGrotesque_700Bold',
  },
  value: {
    fontSize: FontSize.sm,
    color: Colors.primaryLight,
    fontFamily: 'BricolageGrotesque_700Bold',
  },
});
