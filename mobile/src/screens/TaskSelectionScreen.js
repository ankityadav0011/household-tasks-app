import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import Banner from '../components/Banner';
import { EmptyView, ErrorView, LoadingView } from '../components/StateViews';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors, radius } from '../theme';

// Used twice: as the onboarding step ("OnboardingTasks") and from Home to edit the selection ("EditTasks").
export default function TaskSelectionScreen({ navigation, route }) {
  const { updateOnboarding, logout } = useAuth();
  const isEditing = route.name === 'EditTasks';

  const [state, setState] = useState({ status: 'loading', tasks: [], error: null });
  const [selected, setSelected] = useState(() => new Set());
  const [query, setQuery] = useState('');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading', error: null }));
    try {
      const [catalogue, selection] = await Promise.all([api.getTasks(), api.getSelectedTasks()]);
      setState({ status: 'ready', tasks: catalogue.tasks, error: null });
      setSelected(new Set(selection.tasks.map((t) => t.id)));
    } catch (err) {
      setState({ status: 'error', tasks: [], error: err.message });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Filter by the search text, then group by category for the SectionList.
  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? state.tasks.filter((t) => `${t.name} ${t.category} ${t.description}`.toLowerCase().includes(q))
      : state.tasks;
    const byCategory = new Map();
    filtered.forEach((task) => {
      if (!byCategory.has(task.category)) byCategory.set(task.category, []);
      byCategory.get(task.category).push(task);
    });
    return [...byCategory.entries()].map(([title, data]) => ({ title, data }));
  }, [state.tasks, query]);

  const selectedTasks = useMemo(() => state.tasks.filter((t) => selected.has(t.id)), [state.tasks, selected]);

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await api.saveTaskSelection([...selected]);
      setConfirmVisible(false);
      updateOnboarding({ tasksSelected: true }); // first time: navigator moves to Home
      if (isEditing) navigation.goBack();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const renderTask = ({ item }) => {
    const isSelected = selected.has(item.id);
    return (
      <Pressable
        onPress={() => toggle(item.id)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSelected }}
        style={[styles.row, isSelected && styles.rowSelected]}
      >
        <View style={[styles.checkbox, isSelected && styles.checkboxOn]}>
          {isSelected ? <Text style={styles.tick}>✓</Text> : null}
        </View>
        <View style={styles.rowText}>
          <Text style={styles.taskName}>{item.name}</Text>
          <Text style={styles.taskDesc}>{item.description}</Text>
        </View>
      </Pressable>
    );
  };

  let body;
  if (state.status === 'loading') {
    body = <LoadingView message="Loading tasks..." />;
  } else if (state.status === 'error') {
    body = <ErrorView message={state.error} onRetry={load} />;
  } else if (state.tasks.length === 0) {
    body = <EmptyView title="No tasks available" message="Please check back in a little while." actionTitle="Refresh" onAction={load} />;
  } else {
    body = (
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderTask}
        renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyView title="No matching tasks" message={`Nothing found for "${query.trim()}". Try a different word.`} actionTitle="Clear search" onAction={() => setQuery('')} />
        }
      />
    );
  }

  const ready = state.status === 'ready' && state.tasks.length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>{isEditing ? 'Edit your tasks' : 'What can we handle for you?'}</Text>
          {isEditing ? (
            <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
              <Text style={styles.headerLink}>Cancel</Text>
            </Pressable>
          ) : (
            <Pressable onPress={logout} hitSlop={10}>
              <Text style={styles.headerLink}>Log out</Text>
            </Pressable>
          )}
        </View>
        <Text style={styles.subtitle}>Pick the tasks you want your Lifestyle Manager to take care of.</Text>
        {ready ? (
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search tasks"
            placeholderTextColor={colors.muted}
            style={styles.search}
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search tasks"
          />
        ) : null}
      </View>

      <View style={styles.flex}>{body}</View>

      {ready ? (
        <View style={styles.footer}>
          <Button
            title={selected.size ? `Continue (${selected.size} selected)` : 'Select at least one task'}
            onPress={() => {
              setSaveError(null);
              setConfirmVisible(true);
            }}
            disabled={selected.size === 0}
          />
        </View>
      ) : null}

      {/* Confirm step */}
      <Modal visible={confirmVisible} animationType="slide" onRequestClose={() => setConfirmVisible(false)}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.header}>
            <Text style={styles.title}>Confirm your tasks</Text>
            <Text style={styles.subtitle}>
              You selected {selectedTasks.length} {selectedTasks.length === 1 ? 'task' : 'tasks'}. You can change this later.
            </Text>
          </View>
          <ScrollView contentContainerStyle={styles.listContent}>
            {selectedTasks.map((task) => (
              <View key={task.id} style={styles.confirmRow}>
                <Text style={styles.taskName}>{task.name}</Text>
                <Text style={styles.category}>{task.category}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.footer}>
            <Banner message={saveError} />
            <Button title="Confirm and save" onPress={save} loading={saving} />
            <Button title="Go back" variant="link" onPress={() => setConfirmVisible(false)} disabled={saving} />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { flex: 1, fontSize: 24, fontWeight: '800', color: colors.primaryDark, marginRight: 12 },
  headerLink: { color: colors.primary, fontWeight: '600', fontSize: 15, marginTop: 6 },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: 6, marginBottom: 12, lineHeight: 22 },
  search: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    minHeight: 46,
    fontSize: 16,
    color: colors.text,
  },
  listContent: { paddingHorizontal: 20, paddingBottom: 24, flexGrow: 1 },
  sectionHeader: { fontSize: 13, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 18, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
  },
  rowSelected: { borderColor: colors.primary, backgroundColor: colors.infoBg },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tick: { color: '#fff', fontWeight: '800', fontSize: 14 },
  rowText: { flex: 1 },
  taskName: { fontSize: 16, fontWeight: '600', color: colors.text },
  taskDesc: { fontSize: 13, color: colors.muted, marginTop: 2, lineHeight: 18 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  confirmRow: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 8 },
  category: { fontSize: 13, color: colors.primary, marginTop: 2 },
});
