'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth.store'

// Mapbox types
declare global {
  interface Window { mapboxgl: any }
}

interface MapPerson {
  id: string
  first_name: string
  last_name: string
  location: string
  birth_year: number | null
  death_year: number | null
  is_alive: boolean
  generation_num: number
  lat?: number
  lng?: number
}

// Kazakhstan region → coordinates mapping
const REGION_COORDS: Record<string, [number, number]> = {
  'алматы': [76.9286, 43.2567],
  'астана': [71.4460, 51.1801],
  'нур-султан': [71.4460, 51.1801],
  'шымкент': [69.5960, 42.3000],
  'семей': [80.2270, 50.4119],
  'павлодар': [76.9674, 52.2873],
  'актобе': [57.2068, 50.2839],
  'атырау': [51.8878, 47.1167],
  'петропавловск': [69.1335, 54.8643],
  'кызылорда': [65.5092, 44.8523],
  'актау': [51.1727, 43.6477],
  'тараз': [71.3667, 42.9000],
  'костанай': [63.5769, 53.2144],
  'усть-каменогорск': [82.6278, 49.9779],
  'уральск': [51.3727, 51.2271],
  'кокшетау': [69.3948, 53.2891],
  'туркестан': [68.2011, 43.2977],
  'талдыкорган': [78.3766, 44.9980],
  'экибастуз': [75.3250, 51.7183],
  'жезказган': [67.7144, 47.7978],
  'балхаш': [74.9929, 46.8530],
  'темиртау': [72.9647, 50.0600],
}

function getCoords(location: string | null): [number, number] | null {
  if (!location) return null
  const lower = location.toLowerCase()
  for (const [key, coords] of Object.entries(REGION_COORDS)) {
    if (lower.includes(key)) return coords
  }
  return null
}

export default function OriginMap() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const { user } = useAuthStore()
  const [persons, setPersons] = useState<MapPerson[]>([])
  const [loaded, setLoaded] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState<MapPerson | null>(null)
  const [filter, setFilter] = useState<'all' | 'historical' | 'living'>('all')

  // Load Mapbox GL JS dynamically
  useEffect(() => {
    if (window.mapboxgl) { setLoaded(true); return }
    const script = document.createElement('script')
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js'
    script.onload = () => setLoaded(true)
    document.head.appendChild(script)
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css'
    document.head.appendChild(link)
  }, [])

  // Load persons with locations
  useEffect(() => {
    if (!user) return
    const load = async () => {
      const supabase = createClient() as any
      const { data } = await supabase
        .from('persons')
        .select('id,first_name,last_name,location,birth_year,death_year,is_alive,generation_num')
        .eq('added_by_user_id', user.id)
        .not('location', 'is', null)

      const withCoords = ((data ?? []) as MapPerson[]).map((p) => {
        const coords = getCoords(p.location)
        return coords ? { ...p, lat: coords[1], lng: coords[0] } : p
      })
      setPersons(withCoords as MapPerson[])
    }
    load()
  }, [user])

  // Init map when both loaded and persons ready
  useEffect(() => {
    if (!loaded || !mapRef.current || mapInstance.current) return

    const mapboxgl = window.mapboxgl
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ??
      'pk.eyJ1Ijoic2FuZGlxIiwiYSI6ImNseTEifQ.demo' // replace with real token

    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [66.9237, 48.0196], // Kazakhstan center
      zoom: 4.2,
      minZoom: 3,
      maxZoom: 14,
    })

    map.on('load', () => {
      // Custom Kazakhstan-focused style adjustments
      map.setPaintProperty('background', 'background-color', '#0C0A06')

      // Add persons as GeoJSON source
      const geojson = {
        type: 'FeatureCollection' as const,
        features: persons
          .filter(p => p.lat && p.lng)
          .map(p => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [p.lng!, p.lat!] },
            properties: {
              id: p.id,
              name: `${p.first_name} ${p.last_name}`,
              location: p.location,
              birth_year: p.birth_year,
              is_alive: p.is_alive,
              generation: p.generation_num,
            },
          })),
      }

      map.addSource('persons', { type: 'geojson', data: geojson, cluster: true, clusterMaxZoom: 8, clusterRadius: 40 })

      // Cluster circles
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'persons',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'], '#C8972A', 5, '#E8B84B', 10, '#F5D080'],
          'circle-radius': ['step', ['get', 'point_count'], 20, 5, 28, 10, 36],
          'circle-opacity': 0.85,
          'circle-stroke-color': 'rgba(200,151,42,0.4)',
          'circle-stroke-width': 2,
        },
      })

      // Cluster count labels
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'persons',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 13,
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        },
        paint: { 'text-color': '#0C0A06' },
      })

      // Individual person markers
      map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'persons',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': ['case', ['get', 'is_alive'], '#00E887', '#C8972A'],
          'circle-radius': 10,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#0C0A06',
          'circle-opacity': 0.9,
        },
      })

      // Click on cluster → zoom in
      map.on('click', 'clusters', (e: any) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })
        const clusterId = features[0].properties.cluster_id
        map.getSource('persons').getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
          if (err) return
          map.easeTo({ center: features[0].geometry.coordinates, zoom })
        })
      })

      // Click on person → show popup
      map.on('click', 'unclustered-point', (e: any) => {
        const props = e.features[0].properties
        const person = persons.find(p => p.id === props.id)
        if (person) setSelectedPerson(person)
      })

      map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = '' })
      map.on('mouseenter', 'unclustered-point', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'unclustered-point', () => { map.getCanvas().style.cursor = '' })

      // Migration route lines between generations
      if (persons.filter(p => p.lat).length > 1) {
        const sortedByGen = persons
          .filter(p => p.lat && p.lng)
          .sort((a, b) => a.generation_num - b.generation_num)

        if (sortedByGen.length >= 2) {
          map.addSource('migration-route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: sortedByGen.map(p => [p.lng!, p.lat!]),
              },
              properties: {},
            },
          })

          map.addLayer({
            id: 'migration-line',
            type: 'line',
            source: 'migration-route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': 'rgba(200,151,42,0.4)',
              'line-width': 2,
              'line-dasharray': [2, 3],
            },
          })
        }
      }
    })

    mapInstance.current = map
    return () => { map.remove(); mapInstance.current = null }
  }, [loaded, persons])

  const withLocation = persons.filter(p => p.lat && p.lng)

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-bold text-ink text-xl">Карта происхождения</h2>
          <p className="font-body italic text-ink/40 text-sm">
            {withLocation.length} предков на карте · пунктир = маршрут миграции
          </p>
        </div>
        <div className="flex gap-2">
          {(['all', 'living', 'historical'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`font-mono text-[9px] tracking-widest uppercase px-3 py-1.5 rounded-full border transition-all ${
                filter === f ? 'bg-ink text-parchment border-ink' : 'border-ink/20 text-ink/40 hover:border-ink/40'
              }`}>
              {f === 'all' ? 'Все' : f === 'living' ? '● Живые' : '✦ История'}
            </button>
          ))}
        </div>
      </div>

      {/* No Mapbox token warning */}
      {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <div className="font-mono text-[10px] text-amber-700 font-bold tracking-widest uppercase mb-1">Нужен Mapbox токен</div>
            <p className="font-body text-amber-700 text-sm">
              Добавьте <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_MAPBOX_TOKEN</code> в .env.local.
              Получите бесплатно на <a href="https://mapbox.com" target="_blank" className="underline">mapbox.com</a>
            </p>
          </div>
        </div>
      )}

      {/* Map container */}
      <div ref={mapRef} className="w-full h-[480px] rounded-2xl overflow-hidden border border-gold/15" />

      {/* Legend */}
      <div className="flex items-center gap-6 mt-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#00E887]" />
          <span className="font-mono text-[9px] text-ink/40 tracking-widest uppercase">Живые</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gold" />
          <span className="font-mono text-[9px] text-ink/40 tracking-widest uppercase">Исторические</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 border-t-2 border-dashed border-gold/40" />
          <span className="font-mono text-[9px] text-ink/40 tracking-widest uppercase">Маршрут семьи</span>
        </div>
      </div>

      {/* Persons without location */}
      {persons.filter(p => !p.lat).length > 0 && (
        <div className="mt-4 bg-parchment-2/50 border border-gold/10 rounded-xl p-4">
          <div className="font-mono text-[9px] text-ink/30 tracking-widest uppercase mb-2">
            Не указан регион ({persons.filter(p => !p.lat).length} предков)
          </div>
          <div className="flex flex-wrap gap-2">
            {persons.filter(p => !p.lat).map(p => (
              <span key={p.id} className="font-body text-sm text-ink/50 bg-white border border-gold/10 rounded-full px-3 py-1">
                {p.first_name} {p.last_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Person detail popup */}
      {selectedPerson && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
             onClick={() => setSelectedPerson(null)}>
          <div className="bg-parchment rounded-2xl p-6 w-full max-w-sm border border-gold/20"
               onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="text-4xl">{selectedPerson.is_alive ? '👤' : '👴'}</div>
              <div>
                <h3 className="font-display font-bold text-ink text-xl">
                  {selectedPerson.first_name} {selectedPerson.last_name}
                </h3>
                <p className="font-body italic text-ink/40 text-sm">
                  {selectedPerson.birth_year}
                  {!selectedPerson.is_alive && selectedPerson.death_year ? ` — ${selectedPerson.death_year}` : selectedPerson.is_alive ? ' — жив(а)' : ''}
                </p>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-ink/60">
                <span>📍</span><span>{selectedPerson.location}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-ink/60">
                <span>⏳</span>
                <span>Поколение {selectedPerson.generation_num < 0 ? `${Math.abs(selectedPerson.generation_num)} назад` : `+${selectedPerson.generation_num}`}</span>
              </div>
            </div>
            <a href={`/ancestor/${selectedPerson.id}`}
               className="btn-primary block text-center text-sm py-3">
              Открыть профиль →
            </a>
            <button onClick={() => setSelectedPerson(null)}
                    className="w-full mt-2 font-mono text-[10px] text-ink/30 tracking-widest uppercase py-2 hover:text-ink/60 transition-colors">
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
