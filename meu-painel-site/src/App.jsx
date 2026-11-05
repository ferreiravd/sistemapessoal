import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  CalendarDays, Lightbulb, Clock3, LogOut, Menu, Plus, Trash2, Pencil,
  ChevronLeft, ChevronRight, X, Save, LayoutDashboard, LockKeyhole,
  CircleCheck, CircleAlert, Search, Settings2
} from 'lucide-react';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = URL && KEY ? createClient(URL, KEY) : null;
const LOGIN_EMAIL = 'vinicius@painel.local';
const today = () => new Date().toISOString().slice(0,10);
const fmt = (mins) => {
  const sign = mins < 0 ? '-' : '+';
  const n = Math.abs(mins);
  return `${sign}${Math.floor(n/60)}h ${String(n%60).padStart(2,'0')}min`;
};
const minutes = (t) => { if (!t) return 0; const [h,m] = t.split(':').map(Number); return h*60+m; };

function Login({ onLogin }) {
  const [user,setUser] = useState('vinicius');
  const [password,setPassword] = useState('');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    if (!supabase) { setError('Configure o Supabase no arquivo .env antes de acessar.'); setBusy(false); return; }
    if (user.trim().toLowerCase() !== 'vinicius') { setError('Usuário ou senha incorretos.'); setBusy(false); return; }
    const {data,error} = await supabase.auth.signInWithPassword({email:LOGIN_EMAIL,password});
    if (error) setError('Não foi possível entrar. Confira seu usuário e senha.');
    else onLogin(data.session);
    setBusy(false);
  }
  return <main className="login-wrap">
    <section className="login-card">
      <div className="brand-mark"><LayoutDashboard size={25}/></div>
      <p className="eyebrow">ESPAÇO PESSOAL</p><h1>Meu Painel</h1>
      <p className="muted">Sua rotina, suas ideias e seu tempo em um só lugar.</p>
      <form onSubmit={submit}>
        <label>Usuário</label><input value={user} onChange={e=>setUser(e.target.value)} autoComplete="username" required/>
        <label>Senha</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required/>
        {error && <p className="error">{error}</p>}
        <button className="primary full" disabled={busy}>{busy?'Entrando…':'Acessar painel'}</button>
      </form>
      <div className="secure"><LockKeyhole size={14}/> Acesso protegido por autenticação</div>
    </section>
  </main>;
}

function App() {
  const [session,setSession] = useState(null);
  const [tab,setTab] = useState('home');
  const [menu,setMenu] = useState(false);
  const [events,setEvents] = useState([]);
  const [notes,setNotes] = useState([]);
  const [entries,setEntries] = useState([]);
  const [daily,setDaily] = useState(528);
  const [loading,setLoading] = useState(false);
  const [notice,setNotice] = useState('');
  const [eventModal,setEventModal] = useState(false);
  const [noteModal,setNoteModal] = useState(false);
  const [entryModal,setEntryModal] = useState(false);
  const [editing,setEditing] = useState(null);
  const [month,setMonth] = useState(new Date());
  const [search,setSearch] = useState('');
  const [eventForm,setEventForm] = useState({title:'',description:'',event_date:today(),event_time:''});
  const [noteForm,setNoteForm] = useState({title:'',content:'',color:'gold'});
  const [entryForm,setEntryForm] = useState({work_date:today(),start_time:'08:00',end_time:'17:48',break_minutes:60,observation:''});

  useEffect(()=>{
    if (!supabase) return;
    supabase.auth.getSession().then(({data})=>setSession(data.session));
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,s)=>setSession(s));
    return ()=>subscription.unsubscribe();
  },[]);
  useEffect(()=>{ if(session) loadAll(); },[session]);
  async function loadAll(){
    setLoading(true);
    const [a,b,c,s] = await Promise.all([
      supabase.from('agenda_events').select('*').order('event_date').order('event_time'),
      supabase.from('brainstorm_notes').select('*').order('updated_at',{ascending:false}),
      supabase.from('work_entries').select('*').order('work_date',{ascending:false}),
      supabase.from('work_settings').select('*').maybeSingle()
    ]);
    if(!a.error) setEvents(a.data||[]);
    if(!b.error) setNotes(b.data||[]);
    if(!c.error) setEntries(c.data||[]);
    if(s.data) setDaily(s.data.daily_minutes);
    setLoading(false);
  }
  function msg(t){setNotice(t);setTimeout(()=>setNotice(''),2800);}
  async function saveEvent(e){
    e.preventDefault();
    const payload={...eventForm,event_time:eventForm.event_time||null};
    const q=editing ? supabase.from('agenda_events').update(payload).eq('id',editing) : supabase.from('agenda_events').insert(payload);
    const {error}=await q;
    if(error) return msg('Erro ao salvar compromisso.');
    setEventModal(false);setEditing(null);setEventForm({title:'',description:'',event_date:today(),event_time:''});loadAll();msg('Compromisso salvo.');
  }
  async function saveNote(e){
    e.preventDefault();
    const q=editing ? supabase.from('brainstorm_notes').update(noteForm).eq('id',editing) : supabase.from('brainstorm_notes').insert(noteForm);
    const {error}=await q;
    if(error) return msg('Erro ao salvar ideia.');
    setNoteModal(false);setEditing(null);setNoteForm({title:'',content:'',color:'gold'});loadAll();msg('Anotação salva.');
  }
  async function saveEntry(e){
    e.preventDefault();
    const {error}=await supabase.from('work_entries').upsert(entryForm,{onConflict:'user_id,work_date'});
    if(error) return msg('Erro ao registrar jornada. Já existe um registro para essa data?');
    setEntryModal(false);loadAll();msg('Jornada registrada.');
  }
  async function remove(table,id){
    if(!confirm('Deseja excluir este registro?')) return;
    const {error}=await supabase.from(table).delete().eq('id',id);
    if(error) msg('Não foi possível excluir.'); else {loadAll();msg('Registro excluído.');}
  }
  async function saveDaily(v){
    const value=Math.max(0,Number(v)||0);
    const {error}=await supabase.from('work_settings').upsert({id:1,daily_minutes:value});
    if(error) msg('Não foi possível atualizar a jornada.'); else {setDaily(value);msg('Jornada padrão atualizada.');}
  }
  const balance = useMemo(()=>entries.reduce((sum,r)=>sum+(minutes(r.end_time)-minutes(r.start_time)-Number(r.break_minutes||0)-daily),0),[entries,daily]);
  const currentMonth = month.getMonth(), currentYear=month.getFullYear();
  const firstDay = new Date(currentYear,currentMonth,1).getDay();
  const daysInMonth = new Date(currentYear,currentMonth+1,0).getDate();
  const monthEvents = events.filter(e=>{const d=new Date(`${e.event_date}T00:00:00`);return d.getMonth()===currentMonth&&d.getFullYear()===currentYear;});
  const filteredNotes = notes.filter(n=>(n.title+' '+n.content).toLowerCase().includes(search.toLowerCase()));
  const monthLabel = month.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  const nav=[['home','Visão geral',LayoutDashboard],['agenda','Agenda',CalendarDays],['brainstorm','Brainstorm',Lightbulb],['hours','Banco de horas',Clock3]];
  if(!session) return <Login onLogin={setSession}/>;
  return <div className="app-shell">
    <aside className={`sidebar ${menu?'open':''}`}>
      <div className="side-brand"><div className="brand-mark small"><LayoutDashboard size={19}/></div><span>Meu Painel</span><button className="icon-btn close-menu" onClick={()=>setMenu(false)}><X/></button></div>
      <p className="side-caption">MENU PRINCIPAL</p>
      {nav.map(([id,label,Icon])=><button key={id} className={`nav-item ${tab===id?'active':''}`} onClick={()=>{setTab(id);setMenu(false);}}><Icon size={18}/>{label}</button>)}
      <div className="side-bottom"><div className="user-chip"><div className="avatar">V</div><div><b>Vinicius</b><small>Conta pessoal</small></div></div><button className="nav-item logout" onClick={()=>supabase.auth.signOut()}><LogOut size={18}/>Sair</button></div>
    </aside>
    {menu && <div className="scrim" onClick={()=>setMenu(false)}/>}
    <main className="main">
      <header className="topbar"><button className="icon-btn menu-trigger" onClick={()=>setMenu(true)}><Menu/></button><div><span className="eyebrow">PAINEL PESSOAL</span><h2>{nav.find(x=>x[0]===tab)?.[1]}</h2></div><div className="top-date">{new Date().toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short'})}</div></header>
      {loading && <div className="loading">Carregando seus dados…</div>}
      {notice && <div className="toast"><CircleCheck size={16}/>{notice}</div>}
      {tab==='home' && <section className="content">
        <div className="welcome"><div><p className="eyebrow">BEM-VINDO DE VOLTA</p><h1>Organize suas ideias.<br/><em>Cuide do seu tempo.</em></h1><p className="muted">Tudo o que você precisa para acompanhar sua rotina.</p></div><div className="welcome-icon"><LayoutDashboard size={38}/></div></div>
        <div className="stats">
          <div className="stat-card"><div className="stat-icon"><CalendarDays/></div><span>Compromissos</span><strong>{events.length}</strong><small>na sua agenda</small></div>
          <div className="stat-card"><div className="stat-icon"><Lightbulb/></div><span>Ideias guardadas</span><strong>{notes.length}</strong><small>no brainstorm</small></div>
          <div className="stat-card"><div className="stat-icon"><Clock3/></div><span>Saldo de horas</span><strong className={balance>=0?'positive':'negative'}>{fmt(balance)}</strong><small>acumulado</small></div>
        </div>
        <div className="section-heading"><div><p className="eyebrow">ACOMPANHAMENTO</p><h3>Próximos compromissos</h3></div><button className="text-btn" onClick={()=>setTab('agenda')}>Ver agenda <ChevronRight size={16}/></button></div>
        <div className="panel">{events.filter(e=>e.event_date>=today()).slice(0,4).map(e=><div className="event-row" key={e.id}><div className="event-date"><b>{new Date(e.event_date+'T00:00:00').getDate()}</b><small>{new Date(e.event_date+'T00:00:00').toLocaleDateString('pt-BR',{month:'short'})}</small></div><div className="event-info"><b>{e.title}</b><small>{e.description||'Sem descrição'}</small></div><span className="event-time">{e.event_time||'Sem horário'}</span></div>)}{!events.filter(e=>e.event_date>=today()).length&&<div className="empty">Nenhum compromisso próximo. Que tal adicionar um?</div>}</div>
      </section>}
      {tab==='agenda' && <section className="content">
        <div className="page-intro"><div><p className="eyebrow">ORGANIZAÇÃO</p><h1>Sua agenda</h1><p className="muted">Planeje seus compromissos e acompanhe o mês.</p></div><button className="primary" onClick={()=>{setEditing(null);setEventForm({title:'',description:'',event_date:today(),event_time:''});setEventModal(true);}}><Plus size={17}/> Novo compromisso</button></div>
        <div className="calendar panel"><div className="calendar-head"><button className="icon-btn" onClick={()=>setMonth(new Date(currentYear,currentMonth-1,1))}><ChevronLeft/></button><h3>{monthLabel}</h3><button className="icon-btn" onClick={()=>setMonth(new Date(currentYear,currentMonth+1,1))}><ChevronRight/></button></div><div className="calendar-grid">{['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d=><div className="weekday" key={d}>{d}</div>)}{Array.from({length:firstDay},(_,i)=><div key={'blank'+i}/>)}{Array.from({length:daysInMonth},(_,i)=>{const day=i+1;const date=`${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;const has=events.some(e=>e.event_date===date);return <button key={day} className={`day ${date===today()?'today':''} ${has?'has-event':''}`} onClick={()=>{setEventForm({...eventForm,event_date:date});setEditing(null);setEventModal(true);}}><span>{day}</span>{has&&<i/>}</button>})}</div></div>
        <div className="section-heading"><div><p className="eyebrow">SEUS REGISTROS</p><h3>Compromissos do mês</h3></div></div>
        <div className="panel">{monthEvents.length?monthEvents.map(e=><div className="event-row" key={e.id}><div className="event-date"><b>{new Date(e.event_date+'T00:00:00').getDate()}</b><small>{new Date(e.event_date+'T00:00:00').toLocaleDateString('pt-BR',{month:'short'})}</small></div><div className="event-info"><b>{e.title}</b><small>{e.description||'Sem descrição'}</small></div><span className="event-time">{e.event_time||'Sem horário'}</span><button className="icon-btn" onClick={()=>{setEditing(e.id);setEventForm({title:e.title,description:e.description||'',event_date:e.event_date,event_time:e.event_time||''});setEventModal(true);}}><Pencil size={16}/></button><button className="icon-btn danger" onClick={()=>remove('agenda_events',e.id)}><Trash2 size={16}/></button></div>):<div className="empty">Nenhum compromisso neste mês.</div>}</div>
      </section>}
      {tab==='brainstorm' && <section className="content">
        <div className="page-intro"><div><p className="eyebrow">IDEIAS EM MOVIMENTO</p><h1>Brainstorm</h1><p className="muted">Um espaço livre para capturar pensamentos, planos e inspirações.</p></div><button className="primary" onClick={()=>{setEditing(null);setNoteForm({title:'',content:'',color:'gold'});setNoteModal(true);}}><Plus size={17}/> Nova ideia</button></div>
        <div className="search-box"><Search size={17}/><input placeholder="Buscar nas suas anotações..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <div className="notes-grid">{filteredNotes.map(n=><article className={`note-card ${n.color||'gold'}`} key={n.id}><div className="note-top"><span className="note-dot"/><div><button className="icon-btn" onClick={()=>{setEditing(n.id);setNoteForm({title:n.title,content:n.content,color:n.color||'gold'});setNoteModal(true);}}><Pencil size={15}/></button><button className="icon-btn danger" onClick={()=>remove('brainstorm_notes',n.id)}><Trash2 size={15}/></button></div></div><h3>{n.title||'Ideia sem título'}</h3><p>{n.content}</p><small>Atualizado em {new Date(n.updated_at).toLocaleDateString('pt-BR')}</small></article>)}{!filteredNotes.length&&<div className="empty wide">Seu espaço está livre. Registre uma ideia quando quiser.</div>}</div>
      </section>}
      {tab==='hours' && <section className="content">
        <div className="page-intro"><div><p className="eyebrow">CONTROLE DE JORNADA</p><h1>Banco de horas</h1><p className="muted">Acompanhe suas horas trabalhadas e o saldo acumulado.</p></div><button className="primary" onClick={()=>{setEntryForm({work_date:today(),start_time:'08:00',end_time:'17:48',break_minutes:60,observation:''});setEntryModal(true);}}><Plus size={17}/> Registrar dia</button></div>
        <div className="hours-summary"><div><span>Saldo acumulado</span><strong className={balance>=0?'positive':'negative'}>{fmt(balance)}</strong><small>Considerando os registros cadastrados</small></div><div className="daily-setting"><label><Settings2 size={16}/> Jornada diária padrão</label><div className="setting-input"><input type="number" min="0" max="1440" value={daily} onChange={e=>setDaily(Number(e.target.value))}/><span>minutos</span><button className="primary small" onClick={()=>saveDaily(daily)}>Salvar</button></div><small>Atual: {Math.floor(daily/60)}h {String(daily%60).padStart(2,'0')}min</small></div></div>
        <div className="section-heading"><div><p className="eyebrow">HISTÓRICO</p><h3>Registros de jornada</h3></div></div>
        <div className="panel">{entries.map(r=>{const worked=minutes(r.end_time)-minutes(r.start_time)-Number(r.break_minutes||0);const diff=worked-daily;return <div className="entry-row" key={r.id}><div className="entry-date"><b>{new Date(r.work_date+'T00:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})}</b><small>{r.start_time} às {r.end_time} · intervalo {r.break_minutes} min</small></div><div className="entry-worked"><small>Trabalhadas</small><b>{fmt(worked).replace('+','')}</b></div><div className={`entry-balance ${diff>=0?'positive':'negative'}`}><small>Saldo do dia</small><b>{fmt(diff)}</b></div><button className="icon-btn danger" onClick={()=>remove('work_entries',r.id)}><Trash2 size={16}/></button></div>})}{!entries.length&&<div className="empty">Nenhum dia registrado ainda.</div>}</div>
        <p className="hint"><CircleAlert size={15}/> O cálculo considera saída menos entrada, descontando o intervalo informado. Ajuste a jornada padrão conforme a regra da empresa.</p>
      </section>}
      <footer>MEU PAINEL <span>•</span> Organização simples, todos os dias.</footer>
    </main>
    {eventModal&&<Modal title={editing?'Editar compromisso':'Novo compromisso'} close={()=>setEventModal(false)}><form onSubmit={saveEvent}><label>Título</label><input required value={eventForm.title} onChange={e=>setEventForm({...eventForm,title:e.target.value})}/><label>Descrição</label><textarea rows="3" value={eventForm.description} onChange={e=>setEventForm({...eventForm,description:e.target.value})}/><div className="form-row"><div><label>Data</label><input type="date" required value={eventForm.event_date} onChange={e=>setEventForm({...eventForm,event_date:e.target.value})}/></div><div><label>Horário (opcional)</label><input type="time" value={eventForm.event_time} onChange={e=>setEventForm({...eventForm,event_time:e.target.value})}/></div></div><ModalActions close={()=>setEventModal(false)}/></form></Modal>}
    {noteModal&&<Modal title={editing?'Editar anotação':'Nova ideia'} close={()=>setNoteModal(false)}><form onSubmit={saveNote}><label>Título</label><input placeholder="Dê um nome para sua ideia" value={noteForm.title} onChange={e=>setNoteForm({...noteForm,title:e.target.value})}/><label>Ideia / anotação</label><textarea rows="7" required placeholder="Escreva livremente… pensamentos, possibilidades, perguntas, planos..." value={noteForm.content} onChange={e=>setNoteForm({...noteForm,content:e.target.value})}/><label>Cor da anotação</label><select value={noteForm.color} onChange={e=>setNoteForm({...noteForm,color:e.target.value})}><option value="gold">Gold</option><option value="green">Fern green</option><option value="cream">Off-white</option></select><ModalActions close={()=>setNoteModal(false)}/></form></Modal>}
    {entryModal&&<Modal title="Registrar jornada" close={()=>setEntryModal(false)}><form onSubmit={saveEntry}><label>Data</label><input type="date" required value={entryForm.work_date} onChange={e=>setEntryForm({...entryForm,work_date:e.target.value})}/><div className="form-row"><div><label>Entrada</label><input type="time" required value={entryForm.start_time} onChange={e=>setEntryForm({...entryForm,start_time:e.target.value})}/></div><div><label>Saída</label><input type="time" required value={entryForm.end_time} onChange={e=>setEntryForm({...entryForm,end_time:e.target.value})}/></div></div><label>Intervalo (minutos)</label><input type="number" min="0" value={entryForm.break_minutes} onChange={e=>setEntryForm({...entryForm,break_minutes:Number(e.target.value)})}/><label>Observação (opcional)</label><textarea rows="2" value={entryForm.observation} onChange={e=>setEntryForm({...entryForm,observation:e.target.value})}/><ModalActions close={()=>setEntryModal(false)}/></form></Modal>}
  </div>;
}
function Modal({title,close,children}){return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close();}}><section className="modal"><div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={close}><X/></button></div>{children}</section></div>}
function ModalActions({close}){return <div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancelar</button><button className="primary" type="submit"><Save size={16}/> Salvar</button></div>}
export default App;