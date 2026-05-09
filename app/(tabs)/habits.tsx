import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Animated, { FadeInDown, FadeIn, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { StreakBadge } from '@/components/StreakBadge';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import {
  getHabits,
  addHabit,
  completeHabit,
  deleteHabit,
  LocalHabit,
} from '@/lib/storage';

const EMOJI_OPTIONS = ['💪', '📚', '🏃', '💧', '🧘', '🎯', '✍️', '🎸', '🍎', '😴', '🧹', '💻', '🌿', '🎨', '🏋️'];
const COLOR_OPTIONS = [
  Colors.primary, Colors.accent, Colors.gold, Colors.success,
  Colors.catPop, '#6366F1', '#F97316', '#EC4899',
];

export default function HabitsScreen() {
  const [habits, setHabits] = useState<LocalHabit[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newEmoji, setNewEmoji] = useState('💪');
  const [newColor, setNewColor] = useState(Colors.primary);
  const [saving, setSaving] = useState(false);

  const loadHabits = async () => {
    const h = await getHabits();
    setHabits(h);
  };

  useFocusEffect(useCallback(() => { loadHabits(); }, []));

  const handleComplete = async (id: string) => {
    const updated = await completeHabit(id);
    setHabits(updated);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Habit', 'Are you sure? This will reset your streak.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updated = await deleteHabit(id);
          setHabits(updated);
        },
      },
    ]);
  };

  const handleAdd = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Oops!', 'Please enter a habit name.');
      return;
    }
    setSaving(true);
    try {
      const h = await addHabit(newTitle.trim(), newEmoji, newColor);
      setHabits((prev) => [...prev, h]);
      setShowModal(false);
      setNewTitle('');
      setNewEmoji('💪');
      setNewColor(Colors.primary);
    } finally {
      setSaving(false);
    }
  };

  const completedCount = habits.filter((h) => h.completedToday).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <Animated.View entering={FadeInDown.springify()} style={styles.header}>
          <View>
            <Text style={styles.title}>Habits ✅</Text>
            <Text style={styles.subtitle}>
              {completedCount}/{habits.length} done today
            </Text>
          </View>
          <Button
            label="+ Add"
            onPress={() => setShowModal(true)}
            size="sm"
          />
        </Animated.View>

        {/* Summary Banner */}
        {habits.length > 0 && (
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <LinearGradient
              colors={completedCount === habits.length && habits.length > 0
                ? [Colors.success, '#059669']
                : [Colors.primary, Colors.primaryDark]}
              style={styles.summaryBanner}
            >
              <Text style={styles.summaryEmoji}>
                {completedCount === habits.length && habits.length > 0 ? '🎉' : '🎯'}
              </Text>
              <Text style={styles.summaryText}>
                {completedCount === habits.length && habits.length > 0
                  ? 'All habits done! Amazing! 🔥'
                  : `${habits.length - completedCount} habit${habits.length - completedCount !== 1 ? 's' : ''} remaining today`}
              </Text>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Habits List */}
        {habits.length === 0 ? (
          <Animated.View entering={FadeIn.delay(200).springify()} style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={styles.emptyTitle}>No habits yet</Text>
            <Text style={styles.emptyText}>
              Build positive routines by adding your first habit!
            </Text>
            <Button label="Add First Habit 🚀" onPress={() => setShowModal(true)} style={{ marginTop: 16 }} />
          </Animated.View>
        ) : (
          habits.map((habit, i) => (
            <Animated.View key={habit.id} entering={FadeInDown.delay(i * 60).springify()}>
              <HabitCard
                habit={habit}
                onComplete={() => handleComplete(habit.id)}
                onDelete={() => handleDelete(habit.id)}
              />
            </Animated.View>
          ))
        )}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* Add Habit Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={ZoomIn.springify()} style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Habit</Text>

            {/* Title Input */}
            <Text style={styles.inputLabel}>Habit Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Morning Run"
              placeholderTextColor={Colors.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
              maxLength={30}
              autoFocus
            />

            {/* Emoji Picker */}
            <Text style={styles.inputLabel}>Pick an Emoji</Text>
            <View style={styles.emojiGrid}>
              {EMOJI_OPTIONS.map((e) => (
                <TouchableOpacity
                  key={e}
                  onPress={() => setNewEmoji(e)}
                  style={[
                    styles.emojiChip,
                    newEmoji === e && { backgroundColor: Colors.bgOverlay, borderColor: Colors.primary },
                  ]}
                >
                  <Text style={styles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Color Picker */}
            <Text style={styles.inputLabel}>Color</Text>
            <View style={styles.colorRow}>
              {COLOR_OPTIONS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setNewColor(c)}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    newColor === c && styles.colorDotSelected,
                  ]}
                />
              ))}
            </View>

            {/* Preview */}
            <View style={[styles.preview, { borderColor: newColor }]}>
              <Text style={styles.previewEmoji}>{newEmoji}</Text>
              <Text style={[styles.previewTitle, { color: newColor }]}>
                {newTitle || 'Your Habit'}
              </Text>
            </View>

            <View style={styles.modalBtns}>
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => { setShowModal(false); setNewTitle(''); }}
                style={{ flex: 1 }}
              />
              <Button
                label="Add Habit ✅"
                onPress={handleAdd}
                loading={saving}
                style={{ flex: 1 }}
              />
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Habit Card ───────────────────────────────────────────────────────────────
function HabitCard({
  habit,
  onComplete,
  onDelete,
}: {
  habit: LocalHabit;
  onComplete: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={[styles.habitCard, { borderColor: habit.completedToday ? habit.color : Colors.border }]}>
      <TouchableOpacity
        style={[
          styles.checkCircle,
          {
            borderColor: habit.color,
            backgroundColor: habit.completedToday ? habit.color : 'transparent',
          },
        ]}
        onPress={onComplete}
        disabled={habit.completedToday}
      >
        {habit.completedToday && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>

      <View style={styles.habitInfo}>
        <View style={styles.habitTitleRow}>
          <Text style={styles.habitEmoji}>{habit.emoji}</Text>
          <Text
            style={[
              styles.habitTitle,
              habit.completedToday && { textDecorationLine: 'line-through', opacity: 0.6 },
            ]}
          >
            {habit.title}
          </Text>
        </View>
        <View style={styles.habitMeta}>
          <Text style={[styles.habitStreak, { color: habit.color }]}>
            🔥 {habit.streak} day streak
          </Text>
          {habit.longestStreak > 0 && (
            <Text style={styles.habitBest}>Best: {habit.longestStreak}</Text>
          )}
        </View>
      </View>

      <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
        <Text style={styles.deleteTxt}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xxxl,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_900Black',
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
  },
  summaryBanner: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Spacing.md,
  },
  summaryEmoji: { fontSize: 24 },
  summaryText: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
    flex: 1,
  },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    gap: Spacing.sm,
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  habitInfo: { flex: 1, gap: 4 },
  habitTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  habitEmoji: { fontSize: 18 },
  habitTitle: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
  },
  habitMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  habitStreak: { fontSize: FontSize.xs, fontFamily: 'Inter_600SemiBold' },
  habitBest: { fontSize: FontSize.xs, color: Colors.textMuted },
  deleteBtn: { padding: 4 },
  deleteTxt: { fontSize: 18 },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: Spacing.xl,
  },
  emptyEmoji: { fontSize: 64, marginBottom: Spacing.md },
  emptyTitle: {
    fontSize: FontSize.xxl,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.bgElevated,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: {
    fontSize: FontSize.xxl,
    color: Colors.textPrimary,
    fontFamily: 'Outfit_700Bold',
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 4,
  },
  input: {
    backgroundColor: Colors.bgOverlay,
    borderRadius: Radius.md,
    padding: Spacing.md,
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontFamily: 'Inter_400Regular',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiChip: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  emojiText: { fontSize: 22 },
  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: Colors.textPrimary,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1.5,
    marginVertical: 4,
  },
  previewEmoji: { fontSize: 24 },
  previewTitle: {
    fontSize: FontSize.lg,
    fontFamily: 'Outfit_700Bold',
  },
  modalBtns: { flexDirection: 'row', gap: Spacing.sm, marginTop: 4 },
});
