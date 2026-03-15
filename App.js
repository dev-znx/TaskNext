import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Modal, ScrollView, Dimensions, useColorScheme, Alert, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BarChart } from "react-native-chart-kit";

// --- CONFIG & DESIGN ---
const TASK_COLORS = ['#ACFB26', '#70CFFF', '#FFD1DC', '#E0BBE4', '#BFFCC6', '#FF9F68', '#A0E7E5', '#FBE7C6'];
const screenWidth = Dimensions.get("window").width;

export default function App() {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('system'); 
  const [userName, setUserName] = useState('');
  const [taskItems, setTaskItems] = useState([]);
  const [categories, setCategories] = useState(['General', 'Work', 'Personal']);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [onboardingVisible, setOnboardingVisible] = useState(false);

  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';
  const THEME = {
    bg: isDark ? '#000000' : '#F2F2F7',
    card: isDark ? '#1C1C1E' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#000000',
    subtext: isDark ? '#8E8E93' : '#636366',
    border: isDark ? '#38383A' : '#C6C6C8',
    primary: '#ACFB26',
    cyan: '#70CFFF'
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { saveData(); }, [taskItems, categories, xp, level, themeMode, userName]);

  const saveData = async () => {
    try {
      const data = { tasks: taskItems, categories, xp, level, themeMode, userName };
      await AsyncStorage.setItem('taskNext_V1_8_Build', JSON.stringify(data));
    } catch (e) { console.log(e); }
  };

  const loadData = async () => {
    try {
      const saved = await AsyncStorage.getItem('taskNext_V1_8_Build');
      if (saved) {
        const parsed = JSON.parse(saved);
        setTaskItems(parsed.tasks || []);
        setCategories(parsed.categories || ['General', 'Work', 'Personal']);
        setXp(parsed.xp || 0); setLevel(parsed.level || 1);
        setThemeMode(parsed.themeMode || 'system');
        setUserName(parsed.userName || '');
        if(!parsed.userName) setOnboardingVisible(true);
      } else { setOnboardingVisible(true); }
    } catch (e) { setOnboardingVisible(true); }
  };

  const getNow = () => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' • ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const moveTask = (index, direction) => {
    const activeTasks = taskItems.filter(t => !t.completed);
    const completedTasks = taskItems.filter(t => t.completed);
    const newActive = [...activeTasks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newActive.length) {
      [newActive[index], newActive[targetIndex]] = [newActive[targetIndex], newActive[index]];
      setTaskItems([...newActive, ...completedTasks]);
    }
  };

  const handleStartFocus = (taskId, navigation) => {
    const targetTask = taskItems.find(t => t.id === taskId);
    if (targetTask && !targetTask.focusStartedAt) {
      setTaskItems(prev => prev.map(t => t.id === taskId ? { ...t, focusStartedAt: getNow() } : t));
    }
    navigation.navigate('Focus', { task: targetTask });
  };

  // --- SCREENS ---

  function HomeScreen({ navigation }) {
    const [task, setTask] = useState('');
    const [newCat, setNewCat] = useState('');
    const [weeks, setWeeks] = useState('0');
    const [days, setDays] = useState('0');
    const [hrs, setHrs] = useState('0');
    const [min, setMin] = useState('0');
    const [sec, setSec] = useState('0');
    const [category, setCategory] = useState('General');
    const [modalVisible, setModalVisible] = useState(false);
    const [subtaskInput, setSubtaskInput] = useState('');
    const [activeSubId, setActiveSubId] = useState(null);

    const handleSaveTask = () => {
      if (!task) return;
      const totalSec = (parseInt(weeks||0)*604800) + (parseInt(days||0)*86400) + (parseInt(hrs||0)*3600) + (parseInt(min||0)*60) + parseInt(sec||0);
      const randomColor = TASK_COLORS[Math.floor(Math.random() * TASK_COLORS.length)];
      setTaskItems([{ 
        id: Date.now(), text: task, allocatedSec: totalSec, category, color: randomColor, 
        startTime: Date.now(), focusStartedAt: null, completed: false, subtasks: [], createdAt: getNow() 
      }, ...taskItems]);
      resetForm();
    };

    const resetForm = () => { setTask(''); setWeeks('0'); setDays('0'); setHrs('0'); setMin('0'); setSec('0'); setCategory('General'); setModalVisible(false); };

    return (
      <View style={[styles.container, {backgroundColor: THEME.bg}]}>
        <View style={styles.header}>
          <View style={{flex: 1}}>
            <Text style={[styles.headerTitle, {color: THEME.primary}]}>{userName ? `Hi, ${userName}! 🚀` : 'Task Next'}</Text>
            <Text style={[styles.lvlText, {color: THEME.subtext}]}>LVL {level} • {xp}/100 XP</Text>
          </View>
          <TouchableOpacity onPress={() => setThemeMode(themeMode === 'light' ? 'dark' : themeMode === 'dark' ? 'system' : 'light')}>
            <Ionicons name={themeMode === 'dark' ? 'moon' : themeMode === 'light' ? 'sunny' : 'contrast'} size={28} color={THEME.text} />
          </TouchableOpacity>
        </View>

        <FlatList data={taskItems.filter(t => !t.completed)} keyExtractor={(t)=>t.id.toString()} contentContainerStyle={{paddingBottom: 20}} renderItem={({item, index})=>(
          <View style={[styles.taskCard, {backgroundColor: item.color}]}>
            <View style={styles.cardLeftCol}>
              <TouchableOpacity onPress={() => moveTask(index, 'up')}><Ionicons name="chevron-up" size={22} color="black" /></TouchableOpacity>
              <TouchableOpacity onPress={() => moveTask(index, 'down')}><Ionicons name="chevron-down" size={22} color="black" /></TouchableOpacity>
            </View>

            <View style={styles.cardMainCol}>
              <View style={styles.cardHeaderRow}>
                <View style={{flex:1}}>
                  <Text style={styles.taskText} numberOfLines={2}>{item.text}</Text>
                  <Text style={styles.timestampText}>Created: {item.createdAt}</Text>
                </View>
                <TouchableOpacity style={styles.cardFocusBtn} onPress={() => handleStartFocus(item.id, navigation)}>
                  <Text style={styles.cardFocusBtnText}>FOCUS</Text>
                </TouchableOpacity>
              </View>

              <View style={{marginTop: 12}}>
                {item.subtasks.map(st => (
                  <TouchableOpacity key={st.id} onPress={() => setTaskItems(taskItems.map(t => t.id === item.id ? {...t, subtasks: t.subtasks.map(s => s.id === st.id ? {...s, done: !s.done} : s)} : t))} style={styles.subtaskRow}>
                    <Ionicons name={st.done ? "checkbox" : "square-outline"} size={18} color="black" />
                    <Text style={[styles.subtaskText, st.done && {textDecorationLine: 'line-through', opacity: 0.4}]}>{st.text}</Text>
                  </TouchableOpacity>
                ))}
                {activeSubId === item.id ? (
                  <View style={styles.subInputBox}>
                    <TextInput style={styles.subInput} placeholder="Next step..." value={subtaskInput} onChangeText={setSubtaskInput} autoFocus />
                    <TouchableOpacity onPress={() => { if(subtaskInput){setTaskItems(taskItems.map(t => t.id === item.id ? {...t, subtasks: [...t.subtasks, {id: Date.now(), text: subtaskInput, done: false}]} : t)); setSubtaskInput(''); setActiveSubId(null); } }}><Ionicons name="checkmark-circle" size={24} color="black" /></TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => setActiveSubId(item.id)} style={styles.addSubTrigger}><Text style={styles.addSubText}>+ ADD SUBTASK</Text></TouchableOpacity>
                )}
              </View>
            </View>

            <TouchableOpacity style={styles.cardDoneBtn} onPress={()=>setTaskItems(taskItems.map(t => { 
              if(t.id === item.id) { 
                setXp(prev => (prev+10 >= 100 ? (setLevel(l=>l+1), 0) : prev+10)); 
                return {...t, completed: true, finishedAt: getNow(), timeTakenSec: Math.round((Date.now()-t.startTime)/1000), completionDate: new Date().toISOString()}; 
              } return t; 
            }))}><Ionicons name="checkmark-circle-outline" size={44} color="black" /></TouchableOpacity>
          </View>
        )} />
        
        <View style={[styles.bottomActionBar, {backgroundColor: THEME.card, borderTopColor: THEME.border}]}>
          <TouchableOpacity style={[styles.addBtnLarge, {backgroundColor: THEME.primary}]} onPress={()=>setModalVisible(true)}><Ionicons name="add" size={24} color="black" /><Text style={styles.addBtnText}>ADD NEW TASK</Text></TouchableOpacity>
        </View>

        <Modal visible={modalVisible} animationType="slide" transparent><View style={styles.modalOverlay}><View style={[styles.modalContent, {backgroundColor: THEME.card}]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.modalTitle, {color: THEME.text}]}>New Task V1.8</Text>
            <TextInput style={[styles.input, {backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', color: THEME.text}]} placeholder="What's the goal?" value={task} onChangeText={setTask} />
            <Text style={[styles.label, {color: THEME.text}]}>Category</Text>
            <View style={styles.catRow}>{categories.map(c => (
              <TouchableOpacity key={c} onPress={()=>setCategory(c)} style={[styles.catBtn, category===c ? {backgroundColor:THEME.primary} : {backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA'}]}>
                <Text style={{color: category===c ? 'black' : THEME.text, fontSize:11, fontWeight:'900'}}>{c}</Text>
              </TouchableOpacity>
            ))}</View>
            <View style={styles.addCatBox}>
              <TextInput style={[styles.input, {flex:1, marginBottom:0, backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', color: THEME.text}]} placeholder="New Cat" value={newCat} onChangeText={setNewCat} />
              <TouchableOpacity onPress={()=>{if(newCat){setCategories([...categories, newCat]); setCategory(newCat); setNewCat('');}}} style={[styles.addCatIcon, {backgroundColor: THEME.primary}]}><Ionicons name="add" size={24} color="black"/></TouchableOpacity>
            </View>
            <View style={styles.timeGrid}>
              {['Wk','D','H','M','S'].map((u, i) => (
                <View key={u} style={styles.timeBox}>
                  <TextInput style={[styles.smallInput, {backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA', color: THEME.text}]} keyboardType="numeric" value={[weeks,days,hrs,min,sec][i]} onChangeText={(v) => [setWeeks,setDays,setHrs,setMin,setSec][i](v)} />
                  <Text style={[styles.unitText, {color: THEME.subtext}]}>{u}</Text>
                </View>
              ))}
            </View>
            <View style={styles.modalActionRow}>
              <TouchableOpacity onPress={resetForm} style={styles.modalCancelBtn}><Text style={{color: THEME.text, fontWeight:'bold'}}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSaveTask} style={[styles.modalSaveBtn, {backgroundColor:THEME.primary}]}><Text style={{color:'black', fontWeight:'bold'}}>Save Task</Text></TouchableOpacity>
            </View>
          </ScrollView>
        </View></View></Modal>
      </View>
    );
  }

  function HistoryScreen() {
    return (
      <View style={[styles.container, {backgroundColor: THEME.bg}]}>
        <View style={styles.header}><Text style={[styles.headerTitle, {color: THEME.text}]}>History 📜</Text></View>
        <FlatList data={taskItems.filter(t=>t.completed)} keyExtractor={(t)=>t.id.toString()} renderItem={({item})=>(
          <View style={[styles.taskCard, {backgroundColor: isDark ? '#1C1C1E' : '#E5E5EA', borderWidth: 1, borderColor: THEME.border}]}>
            <View style={{flex:1}}>
              <Text style={[styles.taskText, {color: THEME.text, textDecorationLine:'line-through', opacity: 0.6}]}>{item.text}</Text>
              <View style={styles.historyLogBox}>
                <Text style={[styles.logText, {color: THEME.subtext}]}>🚀 Active Start: {item.focusStartedAt || item.createdAt}</Text>
                <Text style={[styles.logText, {color: THEME.subtext}]}>✅ Work End: {item.finishedAt}</Text>
                <Text style={[styles.logText, {color: THEME.primary, fontWeight:'900'}]}>⏱ Session: {Math.floor(item.timeTakenSec/60)}m {item.timeTakenSec%60}s</Text>
              </View>
            </View>
            <TouchableOpacity onPress={()=>setTaskItems([{...item, id:Date.now(), completed:false, startTime:Date.now(), focusStartedAt: null, createdAt: getNow()}, ...taskItems])}><Ionicons name="refresh-circle" size={42} color={THEME.primary}/></TouchableOpacity>
          </View>
        )} />
      </View>
    );
  }

  function InsightsScreen() {
    const [period, setPeriod] = useState('Day');
    const completed = taskItems.filter(t => t.completed);
    const filtered = completed.filter(t => {
      const d = new Date(t.completionDate);
      const now = new Date();
      if (period === 'Day') return d.toDateString() === now.toDateString();
      if (period === 'Month') return d.getMonth() === now.getMonth();
      return true;
    });
    const labels = categories.slice(0, 5).map(c => c.substring(0, 3));
    const data = categories.slice(0, 5).map(cat => filtered.filter(t => t.category === cat).length);
    const totalMin = filtered.reduce((acc, t) => acc + (t.timeTakenSec || 0), 0) / 60;
    return (
      <ScrollView style={[styles.container, {backgroundColor: THEME.bg}]}>
        <View style={styles.header}><Text style={[styles.headerTitle, {color: THEME.text}]}>Insights 📊</Text></View>
        <View style={styles.periodRow}>{['Day', 'Month', 'Year'].map(p => (
          <TouchableOpacity key={p} onPress={()=>setPeriod(p)} style={[styles.periodBtn, period === p && {borderBottomColor:THEME.primary}]}>
            <Text style={[styles.periodText, {color: period===p ? THEME.primary : THEME.subtext}]}>{p}</Text>
          </TouchableOpacity>
        ))}</View>
        <View style={[styles.chartWrapper, {backgroundColor: THEME.card}]}>
          {filtered.length > 0 ? <BarChart data={{ labels, datasets: [{ data }] }} width={screenWidth - 50} height={220} chartConfig={{ backgroundColor: THEME.card, backgroundGradientFrom: THEME.card, backgroundGradientTo: THEME.card, color: (opacity = 1) => `rgba(172, 251, 38, ${opacity})`, labelColor: () => THEME.text, decimalPlaces: 0 }} style={{ borderRadius: 16 }} /> : <Text style={{color: THEME.subtext, padding: 20}}>No tracking data yet.</Text>}
        </View>
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, {backgroundColor: THEME.cyan}]}><Text style={styles.statNum}>{filtered.length}</Text><Text style={styles.statLabel}>Tasks Done</Text></View>
          <View style={[styles.statCard, {backgroundColor: THEME.primary}]}><Text style={styles.statNum}>{totalMin.toFixed(0)}m</Text><Text style={styles.statLabel}>Focus Time</Text></View>
        </View>
      </ScrollView>
    );
  }

  function ProfileScreen() {
    const [nameInput, setNameInput] = useState(userName);
    return (
      <View style={[styles.container, {backgroundColor: THEME.bg}]}>
        <View style={styles.header}><Text style={[styles.headerTitle, {color: THEME.text}]}>Profile 👤</Text></View>
        <View style={{padding: 25, alignItems: 'center'}}>
          {/* Logo in Profile */}
          <Image source={require('./assets/logo.png')} style={{ width: 100, height: 100, borderRadius: 25, marginBottom: 20 }} resizeMode="contain" />
          <View style={{width: '100%'}}>
            <Text style={[styles.label, {color: THEME.text}]}>Edit Your Name</Text>
            <TextInput style={[styles.input, {backgroundColor: THEME.card, color: THEME.text, borderWidth: 1, borderColor: THEME.border}]} value={nameInput} onChangeText={setNameInput} />
            <TouchableOpacity style={[styles.addBtnLarge, {backgroundColor: THEME.primary, marginTop: 10}]} onPress={() => {setUserName(nameInput); Alert.alert('Success!', 'Naam update ho gaya.');}}>
              <Text style={styles.addBtnText}>SAVE PROFILE</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.brandingFooter}><Text style={[styles.footerMainText, {color: THEME.text}]}>Task Next Official V1.8</Text><Text style={[styles.footerSubText, {color: THEME.subtext}]}>made with ❤️ by znx</Text></View>
      </View>
    );
  }

  function FocusScreen({ route, navigation }) {
    const { task } = route.params || {};
    const [elapsed, setElapsed] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    useEffect(() => {
      let timer; if (task && !isPaused) timer = setInterval(() => setElapsed(e => e + 1), 1000); return () => clearInterval(timer);
    }, [isPaused, task]);
    if (!task) return <View style={[styles.container, {backgroundColor: '#000', justifyContent:'center', alignItems:'center'}]}><Text style={{color:'white'}}>Task not found.</Text></View>;
    const formatTime = (s) => `${Math.floor(s/3600)}:${(Math.floor((s%3600)/60)).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
    return (
      <View style={[styles.container, {justifyContent:'center', alignItems:'center', backgroundColor: task.color}]}>
        <Text style={{letterSpacing: 4, fontWeight: '900', color: 'black'}}>{isPaused ? 'PAUSED' : 'FOCUSING...'}</Text>
        <Text style={styles.timerLarge}>{formatTime(elapsed)}</Text>
        <Text style={{fontSize: 28, fontWeight: '900', color: 'black', marginBottom: 50, textAlign:'center', paddingHorizontal: 20}}>{task.text}</Text>
        <View style={{flexDirection: 'row', gap: 20}}>
          <TouchableOpacity style={styles.focusBtnUI} onPress={() => setIsPaused(!isPaused)}><Text style={styles.btnTextUI}>{isPaused ? 'CONTINUE' : 'PAUSE'}</Text></TouchableOpacity>
          <TouchableOpacity style={styles.focusBtnUI} onPress={() => navigation.goBack()}><Text style={styles.btnTextUI}>FINISHED</Text></TouchableOpacity>
        </View>
      </View>
    );
  }

  const Tab = createBottomTabNavigator();
  return (
    <NavigationContainer>
      <Modal visible={onboardingVisible} animationType="fade" transparent>
        <View style={styles.onboardOverlay}>
          <View style={[styles.modalContent, {backgroundColor: 'white', alignItems: 'center'}]}>
            {/* Logo in Onboarding */}
            <Image source={require('./assets/logo.png')} style={{ width: 140, height: 140, borderRadius: 30, marginBottom: 20 }} resizeMode="contain" />
            <Text style={[styles.modalTitle, {color: 'black', textAlign: 'center'}]}>Task Next V1.8</Text>
            <TextInput style={[styles.input, {backgroundColor: '#F2F2F7', color: 'black', width: '100%'}]} placeholder="Enter your name" onChangeText={setUserName} />
            <TouchableOpacity style={[styles.addBtnLarge, {backgroundColor: '#ACFB26', width: '100%'}]} onPress={()=>{if(userName){setOnboardingVisible(false); saveData();} else alert('Name is required!');}}>
              <Text style={styles.addBtnText}>GET STARTED</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Tab.Navigator screenOptions={{ headerShown: false, tabBarStyle: { backgroundColor: THEME.card, borderTopWidth: 0, height: 65, paddingBottom: 10 }, tabBarActiveTintColor: THEME.primary }}>
        <Tab.Screen name="Tasks" component={HomeScreen} options={{ tabBarIcon: ({color}) => <Ionicons name="grid" size={24} color={color}/> }} />
        <Tab.Screen name="History" component={HistoryScreen} options={{ tabBarIcon: ({color}) => <Ionicons name="time" size={24} color={color}/> }} />
        <Tab.Screen name="Insights" component={InsightsScreen} options={{ tabBarIcon: ({color}) => <Ionicons name="stats-chart" size={24} color={color}/> }} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: ({color}) => <Ionicons name="person-circle" size={24} color={color}/> }} />
        <Tab.Screen name="Focus" component={FocusScreen} options={{ tabBarButton: () => null }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 70, paddingHorizontal: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  headerTitle: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  lvlText: { fontWeight: '800', fontSize: 13, marginTop: 2 },
  taskCard: { marginHorizontal: 20, marginTop: 15, padding: 20, borderRadius: 30, flexDirection: 'row', alignItems: 'center', elevation: 3 },
  cardLeftCol: { alignItems: 'center', gap: 10, paddingRight: 12, borderRightWidth: 1, borderRightColor: 'rgba(0,0,0,0.05)' },
  cardMainCol: { flex: 1, paddingLeft: 12 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  taskText: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5, color: 'black', lineHeight: 24 },
  timestampText: { fontSize: 10, color: 'rgba(0,0,0,0.5)', fontWeight: '900', marginTop: 4 },
  cardFocusBtn: { backgroundColor: 'black', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginLeft: 10 },
  cardFocusBtnText: { color: 'white', fontSize: 10, fontWeight: '900' },
  cardDoneBtn: { marginLeft: 10 },
  subtaskRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10 },
  subtaskText: { fontSize: 14, fontWeight: '800', color: 'black' },
  subInputBox: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 },
  subInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.4)', padding: 8, borderRadius: 10, fontSize: 12, fontWeight: '600' },
  addSubTrigger: { marginTop: 6 },
  addSubText: { fontSize: 11, fontWeight: '900', opacity: 0.6 },
  historyLogBox: { marginTop: 10, backgroundColor: 'rgba(0,0,0,0.03)', padding: 10, borderRadius: 15 },
  logText: { fontSize: 10, marginBottom: 2, fontWeight: '800' },
  bottomActionBar: { padding: 20, borderTopWidth: 1, height: 110, justifyContent: 'center' },
  addBtnLarge: { flexDirection: 'row', height: 60, borderRadius: 24, justifyContent: 'center', alignItems: 'center', gap: 10, elevation: 4 },
  addBtnText: { fontSize: 16, fontWeight: '900', color: 'black' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center' },
  onboardOverlay: { flex: 1, backgroundColor: 'white', justifyContent: 'center' },
  modalContent: { margin: 20, padding: 25, borderRadius: 35, maxHeight: '90%' },
  modalTitle: { fontSize: 24, fontWeight: '900', marginBottom: 20 },
  input: { padding: 16, borderRadius: 18, marginBottom: 15, fontSize: 16, fontWeight: '600' },
  label: { fontSize: 14, marginBottom: 8, fontWeight: '800' },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  catBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  addCatBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  addCatIcon: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  timeGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  timeBox: { alignItems: 'center', flex: 1 },
  smallInput: { width: '85%', padding: 10, borderRadius: 10, textAlign: 'center', fontWeight: 'bold' },
  unitText: { fontSize: 10, marginTop: 5, fontWeight: '800' },
  modalActionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  modalCancelBtn: { padding: 16, width: '45%', alignItems: 'center' },
  modalSaveBtn: { padding: 16, borderRadius: 20, width: '45%', alignItems: 'center' },
  chartWrapper: { margin: 20, padding: 15, borderRadius: 30, alignItems: 'center', justifyContent:'center', minHeight: 250 },
  periodRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 15 },
  periodBtn: { paddingBottom: 8, borderBottomWidth: 4, borderBottomColor: 'transparent' },
  periodText: { fontWeight: '900', fontSize: 16 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20, marginBottom: 20 },
  statCard: { width: '45%', padding: 20, borderRadius: 28, alignItems: 'center' },
  statNum: { fontSize: 28, fontWeight: '900', color: 'black' },
  statLabel: { fontSize: 12, fontWeight: '800', opacity: 0.6, color: 'black' },
  timerLarge: { fontSize: 80, color: 'black', fontWeight: '900', letterSpacing: -2 },
  focusBtnUI: { paddingHorizontal: 30, paddingVertical: 18, borderRadius: 25, backgroundColor: 'black' },
  btnTextUI: { color: 'white', fontWeight: '900', fontSize: 14 },
  brandingFooter: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center' },
  footerMainText: { fontSize: 18, fontWeight: '900' },
  footerSubText: { fontSize: 13, fontWeight: '800', marginTop: 6, opacity: 0.8 }
});