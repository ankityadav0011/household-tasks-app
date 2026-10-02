import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Button from '../components/Button';
import { EmptyView, ErrorView, LoadingView } from '../components/StateViews';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors, radius } from '../theme';

export default function HomeScreen({ navigation }) {
  const { logout } = useAuth();
  const [state, setState] = useState({ status: 'loading', tasks: [], name: '', error: null });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setState((s) => ({ ...s, status: 'loading', error: null }));
    try {
      const [selection, profile] = await Promise.all([api.getSelectedTasks(), api.getProfile()]);
      setState({ status: 'ready', tasks: selection.tasks, name: profile.profile.name, error: null });
    } catch (err) {
      setState((s) => ({ ...s, status: 'error', error: err.message }));
    }
  }, []);

  // Reload whenever this screen comes back into focus (e.g. after editing tasks).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  const editTasks = () => navigation.navigate('EditTasks');

  let body;
  if (state.status === 'loading') {
    body = <LoadingView message="Loading your tasks..." />;
  } else if (state.status === 'error') {
    body = <ErrorView message={state.error} onRetry={() => load()} />;
  } else {
    body = (
      <FlatList
        data={state.tasks}
        keyExtractor={(item) => String(item.id)}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={styles.sectionTitle}>Your tasks ({state.tasks.length})</Text>}
        ListEmptyComponent={
          <EmptyView title="No tasks yet" message="Choose the tasks you want us to handle." actionTitle="Choose tasks" onAction={editTasks} />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.chip}>{item.category}</Text>
            <Text style={styles.cardDesc}>{item.description}</Text>
          </View>
        )}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.brand}>PadosiPro</Text>
          <Text style={styles.greeting}>{state.name ? `Hello, ${state.name.split(' ')[0]}` : 'Hello'}</Text>
        </View>
        <Pressable onPress={logout} hitSlop={10} accessibilityRole="button">
          <Text style={styles.logout}>Log out</Text>
        </Pressable>
      </View>

      <View style={styles.flex}>{body}</View>

      {state.status === 'ready' && state.tasks.length > 0 ? (
        <View style={styles.footer}>
          <Button title="Edit tasks" variant="secondary" onPress={editTasks} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  brand: { fontSize: 13, fontWeight: '700', color: colors.primary, letterSpacing: 0.5 },
  greeting: { fontSize: 26, fontWeight: '800', color: colors.primaryDark, marginTop: 2 },
  logout: { color: colors.primary, fontWeight: '600', fontSize: 15 },
  list: { padding: 20, paddingTop: 8, flexGrow: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  chip: { alignSelf: 'flex-start', backgroundColor: colors.infoBg, color: colors.primaryDark, fontSize: 12, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, marginTop: 6, overflow: 'hidden' },
  cardDesc: { fontSize: 14, color: colors.muted, marginTop: 8, lineHeight: 20 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
});
