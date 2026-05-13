import { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

// Fix icônes Leaflet avec Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ─── Praticiens ───────────────────────────────────────────────────
const PRATICIENS = [
  { id:'p1', nom:'Chakib',    couleur:'#3B82F6', light:'#EFF6FF', initiale:'C'  },
  { id:'p2', nom:'Julien',    couleur:'#10B981', light:'#ECFDF5', initiale:'J'  },
  { id:'p3', nom:'Christina', couleur:'#F43F5E', light:'#FFF1F2', initiale:'Ch' },
  { id:'p4', nom:'Manon',     couleur:'#F59E0B', light:'#FFFBEB', initiale:'M'  },
  { id:'p5', nom:'Élodie',    couleur:'#8B5CF6', light:'#F5F3FF', initiale:'É'  },
  { id:'p6', nom:'Corentin',  couleur:'#06B6D4', light:'#ECFEFF', initiale:'Co' },
  { id:'p7', nom:'Maxime',    couleur:'#EF4444', light:'#FEF2F2', initiale:'Mx' },
  { id:'p8', nom:'Annabelle', couleur:'#EC4899', light:'#FDF2F8', initiale:'An' },
  { id:'p9', nom:'Mathilde',  couleur:'#84CC16', light:'#F7FEE7', initiale:'Mt' },
]

const STORAGE_KEY = 'kinedom-patients-v1'
const NOTIF_KEY   = 'kinedom-notifs-v1'
const CABINET = { lat:43.6261, lng:1.3934, nom:'KINÉ OSTÉO PÔLE SPORT', adresse:"9 chemin d'Aussonne, 31700 Blagnac" }

const DEMO_PATIENTS = [
  { id:'d1', nom:'Dupuis Marie',  tel:'06 12 34 56 78', adresse:'12 Av. de Blagnac, Blagnac',      lat:43.631, lng:1.382, praticienId:null, couleur:null,      praticienNom:null,    dateAjout:Date.now()-86400000, ajoutePar:'Julien'    },
  { id:'d2', nom:'Fabre Jean',    tel:'07 23 45 67 89', adresse:'45 Allées Jean Jaurès, Toulouse', lat:43.610, lng:1.449, praticienId:'p2', couleur:'#10B981', praticienNom:'Julien', dateAjout:Date.now()-43200000, ajoutePar:'Julien'    },
  { id:'d3', nom:'Garcia Sofia',  tel:'06 34 56 78 90', adresse:'15 Allée Barcelone, Toulouse',    lat:43.596, lng:1.441, praticienId:null, couleur:null,      praticienNom:null,    dateAjout:Date.now()-7200000,  ajoutePar:'Christina' },
  { id:'d4', nom:'Lebrun Thomas', tel:'06 45 67 89 01', adresse:'8 Rue de la Paix, Colomiers',     lat:43.610, lng:1.360, praticienId:'p1', couleur:'#3B82F6', praticienNom:'Chakib', dateAjout:Date.now()-3600000,  ajoutePar:'Chakib'    },
  { id:'d5', nom:'Martin Claire', tel:'06 56 78 90 12', adresse:'3 Rue des Lilas, Toulouse',       lat:43.585, lng:1.462, praticienId:'p5', couleur:'#8B5CF6', praticienNom:'Élodie', dateAjout:Date.now()-1800000,  ajoutePar:'Élodie'    },
]

function genId() { return 'k'+Date.now().toString(36)+Math.random().toString(36).slice(2,5) }
function fmtTime(ts) { return new Date(ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) }
function fmtDate(ts) { return new Date(ts).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}) }

async function geocodeAdresse(adresse) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(adresse+', France')}&limit=1&countrycodes=fr`)
    const d = await r.json()
    if (d[0]) return { lat:parseFloat(d[0].lat), lng:parseFloat(d[0].lon), ok:true }
  } catch {}
  return { lat:CABINET.lat+(Math.random()-0.5)*0.07, lng:CABINET.lng+(Math.random()-0.5)*0.10, ok:false }
}

// Stockage localStorage (remplace window.storage de Claude)
const storage = {
  get: (key) => { try { const v=localStorage.getItem(key); return v ? { value:v } : null } catch { return null } },
  set: (key, val) => { try { localStorage.setItem(key, val) } catch {} },
}

// Crée une icône SVG colorée
function makePatientIcon(couleur, initiale, isFree) {
  const pulse = isFree ? `
    <circle cx="18" cy="18" r="16" fill="${couleur}" opacity="0.15" style="animation:pulse 2s ease-out infinite"/>` : ''
  const html = `
    <div style="position:relative;width:36px;height:46px">
      ${pulse ? `<svg style="position:absolute;top:-4px;left:-4px" width="44" height="44" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="16" fill="${couleur}" opacity="0.15">
          <animate attributeName="r" values="10;20;10" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.2;0;0.2" dur="2s" repeatCount="indefinite"/>
        </circle>
      </svg>` : ''}
      <svg width="36" height="46" viewBox="0 0 36 46" xmlns="http://www.w3.org/2000/svg">
        <defs><filter id="sh"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.2"/></filter></defs>
        <circle cx="18" cy="18" r="13" fill="${couleur}" stroke="white" stroke-width="2.5" filter="url(#sh)"/>
        <text x="18" y="23" text-anchor="middle" font-size="10" font-weight="800" fill="white" font-family="system-ui">${initiale}</text>
        <path d="M18 46 L11 31 Q18 35 25 31 Z" fill="${couleur}"/>
      </svg>
    </div>`
  return L.divIcon({ html, className:'', iconSize:[36,46], iconAnchor:[18,46], popupAnchor:[0,-48] })
}

function makeCabinetIcon() {
  const html = `
    <svg width="42" height="52" viewBox="0 0 42 52" xmlns="http://www.w3.org/2000/svg">
      <defs><filter id="shc"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#0ea5e9" flood-opacity="0.4"/></filter></defs>
      <circle cx="21" cy="21" r="16" fill="#0ea5e9" stroke="white" stroke-width="3" filter="url(#shc)"/>
      <text x="21" y="27" text-anchor="middle" font-size="16" fill="white">🏥</text>
      <path d="M21 52 L13 35 Q21 40 29 35 Z" fill="#0ea5e9"/>
    </svg>`
  return L.divIcon({ html, className:'', iconSize:[42,52], iconAnchor:[21,52], popupAnchor:[0,-54] })
}

function makeUserIcon() {
  const html = `
    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="16" fill="#3B82F6" opacity="0.2">
        <animate attributeName="r" values="8;16;8" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="12" cy="12" r="8" fill="#3B82F6" stroke="white" stroke-width="2.5"/>
    </svg>`
  return L.divIcon({ html, className:'', iconSize:[24,24], iconAnchor:[12,12], popupAnchor:[0,-14] })
}

// Contrôleur de vue Leaflet (flyTo, géoloc)
function MapController({ flyTo, geolocTrigger, onGeolocResult }) {
  const map = useMap()

  useEffect(() => {
    if (!flyTo) return
    map.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom || 16, { duration:0.8 })
  }, [flyTo])

  useEffect(() => {
    if (!geolocTrigger) return
    onGeolocResult({ status:'loading' })
    map.locate({ setView:true, maxZoom:16, enableHighAccuracy:true, timeout:10000 })
    map.once('locationfound', (e) => {
      onGeolocResult({ status:'ok', lat:e.latlng.lat, lng:e.latlng.lng })
    })
    map.once('locationerror', () => {
      onGeolocResult({ status:'error' })
    })
  }, [geolocTrigger])

  return null
}

// ─── Composant Carte ──────────────────────────────────────
function MapView({ patients, selectedPatient, onSelectPatient, flyTo, geolocTrigger }) {
  const [geoMsg, setGeoMsg] = useState(null)
  const [userPos, setUserPos] = useState(null)
  const userMarkerRef = useRef(null)
  const mapRef = useRef(null)

  function handleGeolocResult({ status, lat, lng }) {
    if (status === 'loading') {
      setGeoMsg({ type:'loading', txt:'Localisation en cours…' })
    } else if (status === 'ok') {
      setUserPos({ lat, lng })
      setGeoMsg({ type:'ok', txt:'Position trouvée !' })
      setTimeout(() => setGeoMsg(null), 3000)
    } else {
      setGeoMsg({ type:'error', txt:'Localisation refusée ou indisponible' })
      setTimeout(() => setGeoMsg(null), 4000)
    }
  }

  const geoColors = {
    loading: { bg:'#EFF6FF', border:'#3B82F6', color:'#1E40AF' },
    ok:      { bg:'#ECFDF5', border:'#10B981', color:'#065F46' },
    error:   { bg:'#FEF2F2', border:'#EF4444', color:'#991B1B' },
  }

  return (
    <div style={{ position:'relative', borderRadius:16, overflow:'hidden', border:'1px solid #e2e8f0', boxShadow:'0 4px 20px rgba(0,0,0,0.08)' }}>
      <MapContainer
        center={[CABINET.lat, CABINET.lng]}
        zoom={13}
        style={{ height:420, width:'100%' }}
        zoomControl={true}
      >
        {/* Tuiles OpenStreetMap — fonctionne sur Vercel/Netlify */}
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />

        {/* Contrôleur flyTo + géoloc */}
        <MapController flyTo={flyTo} geolocTrigger={geolocTrigger} onGeolocResult={handleGeolocResult} />

        {/* Marqueur cabinet */}
        <Marker position={[CABINET.lat, CABINET.lng]} icon={makeCabinetIcon()} zIndexOffset={1000}>
          <Popup>
            <div style={{ fontFamily:'system-ui' }}>
              <b style={{ color:'#0ea5e9', fontSize:13 }}>🏥 {CABINET.nom}</b><br/>
              <span style={{ fontSize:11, color:'#64748b' }}>{CABINET.adresse}</span>
            </div>
          </Popup>
        </Marker>

        {/* Marqueur position utilisateur */}
        {userPos && (
          <Marker position={[userPos.lat, userPos.lng]} icon={makeUserIcon()} zIndexOffset={2000}>
            <Popup>
              <div style={{ fontFamily:'system-ui', fontSize:12, fontWeight:600, color:'#3B82F6' }}>
                📍 Vous êtes ici
              </div>
            </Popup>
          </Marker>
        )}

        {/* Marqueurs patients */}
        {patients.map(p => {
          const prat     = PRATICIENS.find(pr => pr.id === p.praticienId)
          const couleur  = prat ? prat.couleur : '#94a3b8'
          const initiale = prat ? prat.initiale : '?'
          const isSelected = selectedPatient?.id === p.id

          return (
            <Marker
              key={p.id}
              position={[p.lat, p.lng]}
              icon={makePatientIcon(couleur, initiale, !p.praticienId)}
              zIndexOffset={isSelected ? 500 : 0}
              eventHandlers={{ click: () => onSelectPatient(p) }}
            >
              <Popup>
                <div style={{ fontFamily:'system-ui', minWidth:170 }}>
                  <div style={{ fontWeight:700, fontSize:14, color:'#0f172a', marginBottom:5 }}>{p.nom}</div>
                  <div style={{ fontSize:12, color:'#64748b', marginBottom:2 }}>📍 {p.adresse}</div>
                  <div style={{ fontSize:12, color:'#3B82F6', fontWeight:600, marginBottom:6 }}>📞 {p.tel}</div>
                  <div style={{ fontSize:11, fontWeight:700, color:couleur, background:couleur+'18', padding:'3px 8px', borderRadius:6, display:'inline-block' }}>
                    {prat ? '✅ '+prat.nom : '⚡ Disponible'}
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* Badge cabinet */}
      <div style={{ position:'absolute', top:10, left:10, zIndex:999, background:'rgba(255,255,255,0.96)', border:'1px solid #e0f2fe', borderRadius:10, padding:'5px 10px', boxShadow:'0 2px 8px rgba(0,0,0,0.08)', pointerEvents:'none' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#0ea5e9' }}>🏥 KINÉ OSTÉO PÔLE SPORT</div>
        <div style={{ fontSize:10, color:'#94a3b8' }}>{CABINET.adresse}</div>
      </div>

      {/* Feedback géoloc */}
      {geoMsg && (
        <div style={{ position:'absolute', bottom:54, left:10, zIndex:999, background:geoColors[geoMsg.type].bg, border:`1px solid ${geoColors[geoMsg.type].border}`, color:geoColors[geoMsg.type].color, borderRadius:10, padding:'7px 12px', fontSize:12, fontWeight:500, boxShadow:'0 2px 8px rgba(0,0,0,0.08)' }}>
          {geoMsg.type==='loading'?'⏳ ':geoMsg.type==='ok'?'✅ ':'⚠️ '}{geoMsg.txt}
        </div>
      )}

      {/* Légende */}
      <div style={{ position:'absolute', bottom:10, right:10, zIndex:999, background:'rgba(255,255,255,0.96)', border:'1px solid #e2e8f0', borderRadius:10, padding:'8px 12px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize:10, color:'#94a3b8', fontWeight:700, marginBottom:5, textTransform:'uppercase', letterSpacing:'0.4px' }}>Légende</div>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:10, color:'#64748b', marginBottom:3 }}>
          <div style={{ width:9, height:9, borderRadius:'50%', background:'#94a3b8' }}/> Disponible
        </div>
        {PRATICIENS.filter(pr => patients.some(p => p.praticienId === pr.id)).map(pr => (
          <div key={pr.id} style={{ display:'flex', alignItems:'center', gap:6, fontSize:10, color:pr.couleur, marginBottom:2 }}>
            <div style={{ width:9, height:9, borderRadius:'50%', background:pr.couleur }}/> {pr.nom}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Badge statut ─────────────────────────────────────────
function StatusBadge({ prat }) {
  if (prat) return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600, color:prat.couleur, background:prat.light, border:`1px solid ${prat.couleur}33`, borderRadius:20, padding:'3px 10px' }}>
      <span style={{ width:7, height:7, borderRadius:'50%', background:prat.couleur, display:'inline-block' }}/>{prat.nom}
    </span>
  )
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600, color:'#D97706', background:'#FFFBEB', border:'1px solid #F59E0B33', borderRadius:20, padding:'3px 10px' }}>
      <span style={{ width:7, height:7, borderRadius:'50%', background:'#F59E0B', display:'inline-block' }}/>Disponible
    </span>
  )
}

// ─── Fiche patient ─────────────────────────────────────────
function PatientCard({ p, prat, praticienConnecte, onClose, onZoom, onPrendre, onLiberer }) {
  return (
    <div style={{ background:'#fff', border:`1.5px solid ${prat?prat.couleur+'44':'#e2e8f0'}`, borderRadius:16, padding:16, boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
        <div style={{ width:48, height:48, borderRadius:'50%', background:prat?prat.light:'#f8fafc', border:`2px solid ${prat?prat.couleur:'#e2e8f0'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          {prat?<span style={{ fontSize:15, fontWeight:900, color:prat.couleur }}>{prat.initiale}</span>:<span style={{ fontSize:22 }}>👤</span>}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:16, color:'#0f172a', marginBottom:3 }}>{p.nom}</div>
          <StatusBadge prat={prat}/>
        </div>
        {onClose && <button onClick={onClose} style={{ width:32, height:32, background:'#f8fafc', border:'1px solid #e2e8f0', color:'#94a3b8', borderRadius:8, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, background:'#f8fafc', borderRadius:10, padding:'9px 12px' }}>
          <span>📍</span><span style={{ fontSize:13, color:'#475569', flex:1 }}>{p.adresse}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, background:'#f8fafc', borderRadius:10, padding:'9px 12px' }}>
          <span>📞</span><a href={`tel:${p.tel}`} style={{ fontSize:13, color:'#3B82F6', fontWeight:600, textDecoration:'none' }}>{p.tel}</a>
        </div>
        <div style={{ fontSize:11, color:'#94a3b8', paddingLeft:4 }}>Ajouté le {fmtDate(p.dateAjout)}{p.ajoutePar?` · par ${p.ajoutePar}`:''}</div>
      </div>
      <div style={{ display:'flex', gap:8, marginBottom:10 }}>
        {onZoom && <button onClick={()=>onZoom(p)} style={{ flex:1, padding:'8px', background:'#EFF6FF', border:'1px solid #3B82F633', borderRadius:10, color:'#3B82F6', fontWeight:600, cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>🎯 Centrer la carte</button>}
        <button onClick={()=>window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.adresse)}`,'_blank')} style={{ flex:1, padding:'8px', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, color:'#475569', fontWeight:600, cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>🗺️ Itinéraire</button>
        <a href={`tel:${p.tel}`} style={{ padding:'8px 14px', background:'#ECFDF5', border:'1px solid #10B98133', borderRadius:10, color:'#10B981', fontWeight:700, fontSize:13, textDecoration:'none', display:'flex', alignItems:'center' }}>📞</a>
      </div>
      {!p.praticienId && onPrendre && <button onClick={()=>onPrendre(p.id)} style={{ width:'100%', padding:'12px', background:praticienConnecte.couleur, border:'none', borderRadius:12, color:'#fff', fontWeight:700, cursor:'pointer', fontSize:14, boxShadow:`0 4px 14px ${praticienConnecte.couleur}44` }}>✋ Prendre en charge</button>}
      {p.praticienId===praticienConnecte?.id && onLiberer && <button onClick={()=>onLiberer(p.id)} style={{ width:'100%', padding:'12px', background:'#FEF2F2', border:'1px solid #EF444433', borderRadius:12, color:'#EF4444', fontWeight:600, cursor:'pointer', fontSize:13 }}>🔓 Libérer ce patient</button>}
      {p.praticienId && p.praticienId!==praticienConnecte?.id && <div style={{ width:'100%', padding:'11px', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12, color:'#94a3b8', fontSize:13, textAlign:'center' }}>Pris en charge par {p.praticienNom}</div>}
    </div>
  )
}

// ─── Push Banner ───────────────────────────────────────────
function PushBanner({ notif, onClose }) {
  if (!notif) return null
  const isNew = notif.type==='new'
  return (
    <div style={{ position:'fixed', top:14, left:'50%', transform:'translateX(-50%)', zIndex:9999, width:'min(380px,92vw)', background:isNew?'#FFFBEB':'#ECFDF5', border:`1.5px solid ${isNew?'#F59E0B':'#10B981'}`, borderRadius:14, padding:'12px 16px', boxShadow:'0 8px 32px rgba(0,0,0,0.13)', animation:'pushIn 0.35s cubic-bezier(0.34,1.56,0.64,1)', display:'flex', gap:12, alignItems:'flex-start' }}>
      <div style={{ fontSize:24, flexShrink:0 }}>{isNew?'🆕':'✅'}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:700, fontSize:13, color:'#0f172a', marginBottom:2 }}>{isNew?'Nouveau patient ajouté':'Patient pris en charge'}</div>
        <div style={{ fontSize:12, color:'#475569' }}>{notif.msg}</div>
      </div>
      <button onClick={onClose} style={{ background:'none', border:'none', color:'#94a3b8', cursor:'pointer', fontSize:16, flexShrink:0 }}>✕</button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// APP PRINCIPALE
// ═══════════════════════════════════════════════════════
export default function App() {
  const [praticienConnecte, setPraticienConnecte] = useState(null)
  const [patients,          setPatients]          = useState([])
  const [notifications,     setNotifications]     = useState([])
  const [selectedPatient,   setSelectedPatient]   = useState(null)
  const [flyTo,             setFlyTo]             = useState(null)
  const [geolocTrigger,     setGeolocTrigger]     = useState(null)
  const [showAddForm,       setShowAddForm]        = useState(false)
  const [newPatient,        setNewPatient]         = useState({ nom:'', tel:'', adresse:'' })
  const [loading,           setLoading]            = useState(false)
  const [pushBanner,        setPushBanner]         = useState(null)
  const [tab,               setTab]                = useState('carte')
  const pollingRef  = useRef(null)
  const pushRef     = useRef(null)
  const lastNotifTs = useRef(0)

  useEffect(() => {
    loadAll()
    try { const s=sessionStorage.getItem('kinedom-session'); if(s) setPraticienConnecte(JSON.parse(s)) } catch {}
  }, [])

  function loadAll() {
    const rp = storage.get(STORAGE_KEY)
    setPatients(rp ? JSON.parse(rp.value).patients : DEMO_PATIENTS)
    const rn = storage.get(NOTIF_KEY)
    if (rn) { const n=JSON.parse(rn.value).notifications??[]; setNotifications(n); if(n.length) lastNotifTs.current=n[0].ts }
  }

  // Polling toutes les 3s (multi-utilisateurs)
  useEffect(() => {
    pollingRef.current = setInterval(() => {
      const rp = storage.get(STORAGE_KEY)
      if (rp) setPatients(JSON.parse(rp.value).patients??[])
      const rn = storage.get(NOTIF_KEY)
      if (rn) {
        const n=JSON.parse(rn.value).notifications??[]
        setNotifications(n)
        if (n.length && n[0].ts>lastNotifTs.current) { lastNotifTs.current=n[0].ts; showPush(n[0]) }
      }
    }, 3000)
    return () => clearInterval(pollingRef.current)
  }, [])

  function showPush(n) { clearTimeout(pushRef.current); setPushBanner(n); pushRef.current=setTimeout(()=>setPushBanner(null),5000) }

  function savePatients(list) {
    setPatients(list)
    storage.set(STORAGE_KEY, JSON.stringify({patients:list}))
  }

  function pushNotif(msg, type) {
    const n={id:genId(),msg,type,ts:Date.now()}
    setNotifications(prev => {
      const u=[n,...prev].slice(0,40)
      storage.set(NOTIF_KEY, JSON.stringify({notifications:u}))
      return u
    })
    lastNotifTs.current=n.ts
    showPush(n)
  }

  function connecter(p) { setPraticienConnecte(p); sessionStorage.setItem('kinedom-session', JSON.stringify(p)) }

  async function ajouterPatient() {
    if (!newPatient.nom.trim()||!newPatient.adresse.trim()) return
    setLoading(true)
    const coords = await geocodeAdresse(newPatient.adresse)
    const p = {id:genId(),...newPatient,...coords,praticienId:null,couleur:null,praticienNom:null,dateAjout:Date.now(),ajoutePar:praticienConnecte?.nom}
    savePatients([...patients,p])
    pushNotif(`${praticienConnecte.nom} a ajouté : ${p.nom} — ${p.adresse}`, 'new')
    setNewPatient({nom:'',tel:'',adresse:''})
    setShowAddForm(false); setLoading(false); setTab('carte')
    setSelectedPatient(p)
    setFlyTo({lat:p.lat,lng:p.lng,zoom:16,ts:Date.now()})
  }

  async function prendreEnCharge(patientId) {
    if (!praticienConnecte) return
    const updated=patients.map(p=>p.id===patientId?{...p,praticienId:praticienConnecte.id,couleur:praticienConnecte.couleur,praticienNom:praticienConnecte.nom}:p)
    savePatients(updated)
    const pat=patients.find(p=>p.id===patientId)
    pushNotif(`${praticienConnecte.nom} prend en charge ${pat?.nom}`, 'assign')
    setSelectedPatient(prev=>prev?.id===patientId?{...prev,praticienId:praticienConnecte.id,couleur:praticienConnecte.couleur,praticienNom:praticienConnecte.nom}:prev)
  }

  function libererPatient(patientId) {
    savePatients(patients.map(p=>p.id===patientId?{...p,praticienId:null,couleur:null,praticienNom:null}:p))
    setSelectedPatient(null)
  }

  const onSelectPatient = useCallback(p=>setSelectedPatient(prev=>prev?.id===p.id?null:p),[])
  const mesPatientsCount    = patients.filter(p=>p.praticienId===praticienConnecte?.id).length
  const patientsLibresCount = patients.filter(p=>!p.praticienId).length

  // ── LOGIN ──────────────────────────────────────────────
  if (!praticienConnecte) return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#f0f9ff,#e0f2fe 40%,#f0fdf4)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ width:'min(480px,100%)' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:72, height:72, borderRadius:20, background:'linear-gradient(135deg,#0ea5e9,#3B82F6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:34, margin:'0 auto 14px', boxShadow:'0 8px 24px rgba(14,165,233,0.3)' }}>🏥</div>
          <div style={{ fontSize:28, fontWeight:800, color:'#0f172a', letterSpacing:'-0.5px' }}>KinéDom</div>
          <div style={{ fontSize:13, color:'#64748b', marginTop:4 }}>KINÉ OSTÉO PÔLE SPORT · Blagnac</div>
        </div>
        <div style={{ background:'#fff', borderRadius:20, padding:'24px 20px', boxShadow:'0 4px 32px rgba(0,0,0,0.08)', border:'1px solid #e2e8f0' }}>
          <div style={{ fontSize:12, color:'#94a3b8', fontWeight:600, marginBottom:16, textTransform:'uppercase', letterSpacing:'0.6px', textAlign:'center' }}>Sélectionnez votre profil</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {PRATICIENS.map(p=>(
              <button key={p.id} onClick={()=>connecter(p)}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', background:'#f8fafc', border:'1.5px solid #e2e8f0', borderRadius:12, cursor:'pointer', color:'#0f172a', fontSize:14, fontWeight:600, transition:'all 0.18s' }}
                onMouseEnter={e=>{e.currentTarget.style.background=p.light;e.currentTarget.style.borderColor=p.couleur;e.currentTarget.style.transform='translateY(-1px)'}}
                onMouseLeave={e=>{e.currentTarget.style.background='#f8fafc';e.currentTarget.style.borderColor='#e2e8f0';e.currentTarget.style.transform='none'}}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:p.couleur, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:900, color:'#fff', flexShrink:0, boxShadow:`0 3px 8px ${p.couleur}44` }}>{p.initiale}</div>
                {p.nom}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  // ── APP ────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc' }}>
      <PushBanner notif={pushBanner} onClose={()=>{clearTimeout(pushRef.current);setPushBanner(null)}}/>

      <header style={{ background:'#fff', borderBottom:'1px solid #e2e8f0', padding:'12px 16px', display:'flex', alignItems:'center', gap:12, position:'sticky', top:0, zIndex:500, boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ width:38, height:38, borderRadius:10, background:'linear-gradient(135deg,#0ea5e9,#3B82F6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:19, boxShadow:'0 2px 8px rgba(14,165,233,0.25)' }}>🏥</div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:16, color:'#0f172a', letterSpacing:'-0.3px' }}>KinéDom</div>
          <div style={{ fontSize:10, color:'#94a3b8' }}>KINÉ OSTÉO PÔLE SPORT · Blagnac</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {patientsLibresCount>0 && <div style={{ background:'#FFFBEB', border:'1px solid #F59E0B33', borderRadius:20, padding:'4px 10px', fontSize:11, color:'#D97706', fontWeight:700 }}>⚡ {patientsLibresCount}</div>}
          <div style={{ background:praticienConnecte.light, border:`1px solid ${praticienConnecte.couleur}33`, borderRadius:20, padding:'4px 10px', fontSize:11, color:praticienConnecte.couleur, fontWeight:700 }}>🩺 {mesPatientsCount}</div>
          <button onClick={()=>setPraticienConnecte(null)} style={{ width:36, height:36, borderRadius:'50%', background:praticienConnecte.couleur, border:'none', cursor:'pointer', fontSize:12, fontWeight:900, color:'#fff', boxShadow:`0 2px 8px ${praticienConnecte.couleur}55`, flexShrink:0 }}>
            {praticienConnecte.initiale}
          </button>
        </div>
      </header>

      <div style={{ background:'#fff', borderBottom:'1px solid #e2e8f0', display:'flex', position:'sticky', top:62, zIndex:499 }}>
        {[{key:'carte',label:'🗺️  Carte'},{key:'liste',label:`📋  Patients (${patients.length})`},{key:'notifs',label:`🔔  Alertes${notifications.length?` (${Math.min(notifications.length,99)})`:''}`}].map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)} style={{ flex:1, padding:'13px 6px', background:'none', border:'none', borderBottom:tab===t.key?`2.5px solid ${praticienConnecte.couleur}`:'2.5px solid transparent', color:tab===t.key?praticienConnecte.couleur:'#94a3b8', fontWeight:tab===t.key?700:500, fontSize:13, cursor:'pointer', transition:'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding:'16px 14px 100px', maxWidth:680, margin:'0 auto' }}>

        {tab==='carte' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>setGeolocTrigger(Date.now())} style={{ flex:1, padding:'10px', background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, cursor:'pointer', fontSize:13, fontWeight:600, color:'#3B82F6', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                📍 Ma position GPS
              </button>
              <button onClick={()=>setFlyTo({lat:CABINET.lat,lng:CABINET.lng,zoom:14,ts:Date.now()})} style={{ flex:1, padding:'10px', background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, cursor:'pointer', fontSize:13, fontWeight:600, color:'#0ea5e9', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                🏥 Voir le cabinet
              </button>
            </div>

            <MapView
              patients={patients}
              selectedPatient={selectedPatient}
              onSelectPatient={onSelectPatient}
              flyTo={flyTo}
              geolocTrigger={geolocTrigger}
            />

            {selectedPatient && (()=>{
              const p=patients.find(pt=>pt.id===selectedPatient.id); if(!p) return null
              const prat=PRATICIENS.find(pr=>pr.id===p.praticienId)
              return <PatientCard p={p} prat={prat} praticienConnecte={praticienConnecte}
                onClose={()=>setSelectedPatient(null)}
                onZoom={pat=>setFlyTo({lat:pat.lat,lng:pat.lng,zoom:16,ts:Date.now()})}
                onPrendre={prendreEnCharge} onLiberer={libererPatient}/>
            })()}

            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:16, padding:'14px 16px', boxShadow:'0 1px 6px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize:11, color:'#94a3b8', fontWeight:700, marginBottom:12, textTransform:'uppercase', letterSpacing:'0.5px' }}>Équipe</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                {PRATICIENS.map(p=>{
                  const count=patients.filter(pt=>pt.praticienId===p.id).length
                  const isMe=p.id===praticienConnecte.id
                  return <div key={p.id} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 11px', background:isMe?p.light:'#f8fafc', border:`1.5px solid ${isMe?p.couleur:'#e2e8f0'}`, borderRadius:20 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:p.couleur }}/>
                    <span style={{ fontSize:12, color:isMe?p.couleur:'#64748b', fontWeight:isMe?700:500 }}>{p.nom}</span>
                    {count>0 && <span style={{ fontSize:11, background:isMe?p.couleur+'22':'#e2e8f0', borderRadius:10, padding:'1px 7px', color:isMe?p.couleur:'#94a3b8', fontWeight:600 }}>{count}</span>}
                  </div>
                })}
              </div>
            </div>
          </div>
        )}

        {tab==='liste' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {patients.length===0 && <div style={{ textAlign:'center', color:'#94a3b8', padding:'56px 0' }}><div style={{ fontSize:40, marginBottom:12 }}>📋</div><div style={{ fontWeight:600, color:'#64748b' }}>Aucun patient enregistré</div></div>}
            {patients.map(p=>{
              const prat=PRATICIENS.find(pr=>pr.id===p.praticienId)
              return <PatientCard key={p.id} p={p} prat={prat} praticienConnecte={praticienConnecte}
                onZoom={pat=>{setTab('carte');setTimeout(()=>setFlyTo({lat:pat.lat,lng:pat.lng,zoom:16,ts:Date.now()}),200)}}
                onPrendre={prendreEnCharge} onLiberer={libererPatient}/>
            })}
          </div>
        )}

        {tab==='notifs' && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ fontSize:11, color:'#94a3b8', fontWeight:700, marginBottom:4, textTransform:'uppercase', letterSpacing:'0.5px' }}>Activité du cabinet · toutes les 3s</div>
            {notifications.length===0 && <div style={{ textAlign:'center', color:'#94a3b8', padding:'56px 0' }}><div style={{ fontSize:36, marginBottom:10 }}>🔔</div><div style={{ fontWeight:600, color:'#64748b' }}>Aucune activité</div></div>}
            {notifications.map(n=>{
              const isNew=n.type==='new'
              return <div key={n.id} style={{ background:'#fff', border:`1px solid ${isNew?'#FDE68A':'#A7F3D0'}`, borderRadius:12, padding:'12px 14px', display:'flex', gap:12, alignItems:'flex-start', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ width:36, height:36, borderRadius:10, background:isNew?'#FFFBEB':'#ECFDF5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{isNew?'🆕':'✅'}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, color:'#1e293b', lineHeight:1.5, fontWeight:500 }}>{n.msg}</div>
                  <div style={{ fontSize:11, color:'#94a3b8', marginTop:3 }}>{fmtDate(n.ts)} · {fmtTime(n.ts)}</div>
                </div>
              </div>
            })}
          </div>
        )}
      </div>

      {!showAddForm && (
        <button onClick={()=>setShowAddForm(true)} style={{ position:'fixed', bottom:24, right:18, width:58, height:58, borderRadius:'50%', background:praticienConnecte.couleur, border:'none', color:'#fff', fontSize:26, cursor:'pointer', boxShadow:`0 6px 20px ${praticienConnecte.couleur}66`, display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, transition:'transform 0.15s' }}
          onMouseEnter={e=>e.currentTarget.style.transform='scale(1.1)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>+</button>
      )}

      {showAddForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.4)', display:'flex', alignItems:'flex-end', zIndex:600, backdropFilter:'blur(4px)' }} onClick={e=>e.target===e.currentTarget&&setShowAddForm(false)}>
          <div style={{ background:'#fff', borderRadius:'24px 24px 0 0', padding:'20px 18px 40px', width:'100%', maxWidth:520, margin:'0 auto', boxShadow:'0 -8px 40px rgba(0,0,0,0.12)' }}>
            <div style={{ width:40, height:4, background:'#e2e8f0', borderRadius:4, margin:'0 auto 20px' }}/>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ fontWeight:800, fontSize:17, color:'#0f172a' }}>Nouveau patient</div>
              <button onClick={()=>setShowAddForm(false)} style={{ width:32, height:32, background:'#f8fafc', border:'1px solid #e2e8f0', color:'#94a3b8', borderRadius:8, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            </div>
            <div style={{ fontSize:12, color:praticienConnecte.couleur, background:praticienConnecte.light, border:`1px solid ${praticienConnecte.couleur}33`, borderRadius:10, padding:'9px 12px', marginBottom:18, fontWeight:500 }}>
              🩺 Ajout par <b>{praticienConnecte.nom}</b> — toute l'équipe sera notifiée
            </div>
            {[{key:'nom',label:'Nom & prénom',icon:'👤',ph:'Ex : Dupuis Marie',type:'text'},{key:'tel',label:'Téléphone',icon:'📞',ph:'Ex : 06 12 34 56 78',type:'tel'},{key:'adresse',label:'Adresse domicile',icon:'📍',ph:'Ex : 12 Rue des Lilas, Toulouse',type:'text'}].map(f=>(
              <div key={f.key} style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color:'#64748b', fontWeight:600, marginBottom:6, display:'block' }}>{f.icon} {f.label}</label>
                <input type={f.type} value={newPatient[f.key]} onChange={e=>setNewPatient(prev=>({...prev,[f.key]:e.target.value}))} placeholder={f.ph}
                  onKeyDown={e=>e.key==='Enter'&&f.key==='adresse'&&ajouterPatient()}
                  style={{ width:'100%', padding:'12px 14px', background:'#f8fafc', border:'1.5px solid #e2e8f0', borderRadius:11, color:'#0f172a', fontSize:14, outline:'none', boxSizing:'border-box', transition:'border-color 0.15s' }}
                  onFocus={e=>e.target.style.borderColor=praticienConnecte.couleur} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
              </div>
            ))}
            <button onClick={ajouterPatient} disabled={loading} style={{ width:'100%', padding:'14px', background:loading?'#e2e8f0':praticienConnecte.couleur, border:'none', borderRadius:12, color:loading?'#94a3b8':'#fff', fontWeight:700, fontSize:15, cursor:loading?'not-allowed':'pointer', boxShadow:loading?'none':`0 4px 16px ${praticienConnecte.couleur}44`, transition:'all 0.2s' }}>
              {loading?'⏳ Géolocalisation en cours...':'Ajouter et notifier l\'équipe →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
