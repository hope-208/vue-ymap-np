<template>
  <YandexMap
    v-model="map"
    :settings="{
      location: {
        center: [48.401219, 54.332098], // [lng, lat] - Ульяновск
        zoom: 8,
      },
      zoomRange: {
        min: 4,
        max: 19,
      },
      showScaleInCopyrights: true,
    }"
    @update:zoom="handleZoomChange($event)"
    width="100%"
    height="100vh"
  >
    <YandexMapDefaultSchemeLayer />
    <YandexMapDefaultFeaturesLayer />

    <!-- Подсветка Ульяновской области
    <YandexMapFeature
      v-for="(feature, index) in features"
      :key="index"
      :settings="feature" />-->

    <!-- Контролы -->
    <YandexMapControls :settings="{ position: 'left' }">
      <YandexMapZoomControl />
    </YandexMapControls>

    <YandexMapControls :settings="{ position: 'bottom left' }">
      <YandexMapGeolocationControl />
    </YandexMapControls>

    <YandexMapControls :settings="{ position: 'top left' }">
      <YandexMapControlButton :settings="{ onClick: applyFilters }" class="filter-container">
        <!--:settings="{ onClick: toggleFullscreen }"-->
        <el-row style="width: fit-content">
          <el-select
            class="filter"
            v-model="selectedNpName"
            multiple
            filterable
            collapse-tags
            placeholder="Национальный проект"
            label="Национальный проект"
            clearable
            @change="applyFilters"
          >
            <template #header>
              <el-checkbox
                v-model="checkAllNp"
                :indeterminate="indeterminateNp"
                @change="handleCheckAllNp"
              >
                Все
              </el-checkbox>
            </template>
            <el-option v-for="np in uniqueNpNames" :key="np" :label="np" :value="np" />
          </el-select>

          <div style="display: flex; flex-direction: row; gap: 10px; flex: 50%; margin-top: 8px">
            <el-select
              class="filter years"
              v-model="selectedYear"
              placeholder="Год"
              filterable
              clearable
              multiple
              collapse-tags
              @change="applyFilters"
            >
              <template #header>
                <el-checkbox
                  v-model="checkAllYear"
                  :indeterminate="indeterminateYear"
                  @change="handleCheckAllYear"
                >
                  Все
                </el-checkbox>
              </template>
              <el-option
                v-for="year in uniqueYearsFiltered"
                :key="year"
                :label="year"
                :value="year"
              />
            </el-select>
            <el-select
              class="filter"
              v-model="selectedStatus"
              placeholder="Готовность"
              clearable
              multiple
              @change="applyFilters"
            >
              <template #header>
                <el-checkbox
                  v-model="checkAllStatus"
                  :indeterminate="indeterminateStatus"
                  @change="handleCheckAllStatus"
                >
                  Все
                </el-checkbox>
              </template>
              <el-option
                v-for="status in uniqueStatusesFiltered"
                :key="status.value"
                :label="status.label"
                :value="status.value"
              />
            </el-select>
          </div>
        </el-row>
      </YandexMapControlButton>
    </YandexMapControls>

    <YandexMapControls :settings="{ position: 'top right', orientation: 'vertical' }">
      <YandexMapControlButton :settings="{ onClick: toggleFullscreen }">
        <div class="fullscreen" :class="{ 'exit-fullscreen': isFullscreen }" />
      </YandexMapControlButton>
    </YandexMapControls>

    <!-- Кластеризаторы маркеров по национальным проектам -->
    <template v-for="(markersGroup, npName) in groupedMarkers" :key="npName">
      <!-- Отображаем кластеры при зуме меньше 17 -->
      <YandexMapClusterer
        v-if="shouldShowClusters"
        :grid-size="64"
        :zoom-on-cluster-click="true"
        :cluster-screen-distance="30"
        @trueBounds="trueBounds = $event"
      >
        <YandexMapMarker
          v-for="(marker, index) in markersGroup"
          :key="`${npName}-${index}`"
          :settings="{
            coordinates: marker.coordinates || [48.401219, 54.332098],
            onClick: () => togglePopup(markers.indexOf(marker)),
            zIndex: openMarker === markers.indexOf(marker) ? 1 : 0,
          }"
        >
          <el-popover placement="top" :width="400" trigger="click" :title="marker.np_name">
            <template #reference>
              <div class="pin" v-html="generateMarkerSvg(marker)"></div>
            </template>
            <template #default>
              <div class="marker-popup">
                <!-- <h3>{{ marker.np_name }}</h3>
                  <p>Год(ы): {{ formatYearRange(marker.year) }}</p>
                  -->
                <p>{{ marker.name }}</p>
              </div>
            </template>
          </el-popover>
        </YandexMapMarker>

        <!-- Кастомный слот для кластеров -->
        <template #cluster="{ length }">
          <div
            class="cluster-marker"
            v-html="generateClusterSvg(length, markersGroup[0]?.iconColor || '#888888')"
          ></div>
        </template>
      </YandexMapClusterer>

      <!-- Отображаем маркеры напрямую при зуме 17 и выше -->
      <template v-else>
        <YandexMapMarker
          v-for="(marker, index) in markersGroup"
          :key="`${npName}-${index}`"
          :settings="{
            coordinates: marker.coordinates || [48.401219, 54.332098],
            onClick: () => togglePopup(markers.indexOf(marker)),
            zIndex: openMarker === markers.indexOf(marker) ? 1 : 0,
          }"
        >
          <el-popover placement="top" :width="400" trigger="click" :title="marker.np_name">
            <template #reference>
              <div class="pin" v-html="generateMarkerSvg(marker)"></div>
            </template>
            <template #default>
              <div class="marker-popup">
                <p>{{ marker.name }}</p>
              </div>
            </template>
          </el-popover>
        </YandexMapMarker>
      </template>
    </template>
  </YandexMap>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watchEffect, nextTick, watch } from 'vue'
import type {
  YMap,
  LngLatBounds,
  //YMapFeatureProps
} from '@yandex/ymaps3-types'
import { type Marker, markerList } from '../assets/data'
import {
  YandexMap,
  YandexMapClusterer,
  YandexMapControlButton,
  YandexMapControls,
  YandexMapDefaultFeaturesLayer,
  YandexMapDefaultSchemeLayer,
  YandexMapGeolocationControl,
  YandexMapZoomControl,
  YandexMapMarker,
  //YandexMapFeature,
} from 'vue-yandex-maps'

const isFullscreen = ref(false)
const map = ref<YMap>()
const currentZoom = ref(8)
const openMarker = ref<number | null>(null)
const trueBounds = ref<LngLatBounds>([
  [0, 0],
  [0, 0],
])

// Реактивные фильтры
const selectedYear = ref<number[]>([])
const selectedNpName = ref<string[]>([])
const selectedStatus = ref<boolean[]>([])

// Начальное положение карты
/*
const location: YMapLocationRequest = {
  center: [48.401219, 54.332098],
  zoom: 8,
};
*/
// Полигон Ульяновской области (упрощённый)
/*const ulyanovskPolygon: LngLat[] = [
  [45.797506, 52.548958],
  [50.243484, 54.891416],
]*/

// Полигон для затемнения всего кроме Ульяновской области
/*const fullMapPolygon: LngLat[] = [
  [-180, -90],
  [180, -90],
  [180, 90],
  [-180, 90],
  [-180, -90],
]*/
/**/
// Стили для полигонов
/*const features: YMapFeatureProps[] = [
  {
    geometry: {
      type: 'Polygon',
      coordinates: [ulyanovskPolygon],
    },
    style: {
      stroke: [
        {
          color: '#8265CB',
          width: 2,
        },
      ],
      fillOpacity: 0, // Без заливки
    },
  },
  {
    geometry: {
      type: 'Polygon',
      coordinates: [
        fullMapPolygon,
        ulyanovskPolygon, // "дыра", исключает Ульяновскую область
      ],
    },
    style: {
      stroke: [
        {
          color: '#8265CB',
          width: 2,
        },
      ],
      fill: 'rgba(0, 0, 0, 0.2)', // Затемнение
    },
  },
]*/

// Обработка маркеров
const markers = ref<Marker[]>([
  ...markerList.filter((marker) => marker.np_name !== null && marker.np_name !== '-'),
])
const filteredMarkers = ref<Marker[]>([])

const uniqueYears = computed(() => {
  const allYears: number[] = []
  markers.value.forEach((marker) => {
    if (marker.year !== null) {
      if (Array.isArray(marker.year)) {
        allYears.push(...marker.year)
      } else {
        allYears.push(marker.year)
      }
    }
  })
  return [...new Set(allYears)].sort((a, b) => a - b)
})

// Отфильтрованные года в зависимости от выбранных нацпроектов
const uniqueYearsFiltered = computed(() => {
  // Если не выбран ни один национальный проект, показываем все года
  if (selectedNpName.value.length === 0) {
    return uniqueYears.value
  }

  const allYears: number[] = []
  markers.value.forEach((marker) => {
    if (marker.np_name && selectedNpName.value.includes(marker.np_name) && marker.year !== null) {
      if (Array.isArray(marker.year)) {
        allYears.push(...marker.year)
      } else {
        allYears.push(marker.year)
      }
    }
  })
  return [...new Set(allYears)].sort((a, b) => a - b)
})

const uniqueNpNames = computed(() => {
  return [...new Set(markers.value.map((m) => m.np_name))]
    .filter((a): a is string => a !== null && a !== undefined && a !== '-')
    .sort()
})

// Отфильтрованные статусы в зависимости от выбранных нацпроектов
const uniqueStatusesFiltered = computed(() => {
  if (selectedNpName.value.length === 0) {
    return [
      { label: 'План', value: false },
      { label: 'Факт', value: true },
    ]
  }

  const statuses = new Set<boolean>()
  markers.value.forEach((marker) => {
    if (marker.np_name && selectedNpName.value.includes(marker.np_name)) {
      statuses.add(marker.is_ready)
    }
  })

  const result: { label: string; value: boolean }[] = []
  if (statuses.has(false)) result.push({ label: 'План', value: false })
  if (statuses.has(true)) result.push({ label: 'Факт', value: true })
  return result
})

const checkAllNp = ref(false)
const checkAllYear = ref(false)
const checkAllStatus = ref(false)
const indeterminateNp = ref(false)
const indeterminateYear = ref(false)
const indeterminateStatus = ref(false)

watch(selectedNpName, (val) => {
  if (val.length === 0) {
    checkAllNp.value = false
    indeterminateNp.value = false
  } else if (val.length === uniqueNpNames.value.length) {
    checkAllNp.value = true
    indeterminateNp.value = false
  } else {
    indeterminateNp.value = true
  }

  // Очищаем выбранные года, которые больше не актуальны
  const availableYears = uniqueYearsFiltered.value
  selectedYear.value = selectedYear.value.filter((year) => availableYears.includes(year))

  // Обновляем состояние "выбрать все" для годов
  if (selectedYear.value.length === 0) {
    checkAllYear.value = false
    indeterminateYear.value = false
  } else if (selectedYear.value.length === availableYears.length) {
    checkAllYear.value = true
    indeterminateYear.value = false
  } else {
    indeterminateYear.value = true
  }
})

watch(selectedYear, (val) => {
  if (val.length === 0) {
    checkAllYear.value = false
    indeterminateYear.value = false
  } else if (val.length === uniqueYearsFiltered.value.length) {
    checkAllYear.value = true
    indeterminateYear.value = false
  } else {
    indeterminateYear.value = true
  }
})

watch(selectedStatus, (val) => {
  if (val.length === 0) {
    checkAllStatus.value = false
    indeterminateStatus.value = false
  } else if (val.length === uniqueStatusesFiltered.value.length) {
    checkAllStatus.value = true
    indeterminateStatus.value = false
  } else {
    indeterminateStatus.value = true
  }
})

const handleCheckAllNp = (val: boolean) => {
  indeterminateNp.value = false
  if (val) {
    selectedNpName.value = [...uniqueNpNames.value]
  } else {
    selectedNpName.value = []
  }
}
const handleCheckAllYear = (val: boolean) => {
  indeterminateYear.value = false
  if (val) {
    selectedYear.value = [...uniqueYearsFiltered.value]
  } else {
    selectedYear.value = []
  }
}

// const handleCheckAllYear = (val: boolean) => {
//   indeterminateYear.value = false
//   if (val) {
//     selectedYear.value = null // Выбраны все года
//   } else {
//     selectedYear.value = null // Снято выделение - тоже все года
//   }
// }

const handleCheckAllStatus = (val: boolean) => {
  indeterminateStatus.value = false
  if (val) {
    selectedStatus.value = uniqueStatusesFiltered.value.map((status) => status.value)
  } else {
    selectedStatus.value = []
  }
}
// Применение фильтров
const applyFilters = () => {
  filteredMarkers.value = markers.value
    .filter((marker) => {
      // Фильтр по году
      const yearMatch =
        selectedYear.value.length === 0 ||
        (Array.isArray(marker.year)
          ? marker.year.some((year) => selectedYear.value.includes(year))
          : selectedYear.value.includes(marker.year ?? 0))

      // Фильтр по статусу
      const statusMatch =
        selectedStatus.value.length === 0 || selectedStatus.value.includes(marker.is_ready)

      // Фильтр по национальному проекту
      const npMatch =
        selectedNpName.value.length === 0 || selectedNpName.value.includes(marker.np_name!)

      return yearMatch && statusMatch && npMatch
    })
    .sort((a, b) => {
      const aName = a.np_name ?? ''
      const bName = b.np_name ?? ''
      const aYear = Array.isArray(a.year) ? a.year[0] : (a.year ?? 0)
      const bYear = Array.isArray(b.year) ? b.year[0] : (b.year ?? 0)

      if (aName < bName) return -1
      if (aName > bName) return 1

      if (aYear && bYear && aYear < bYear) return -1
      if (aYear && bYear && aYear > bYear) return 1
      return 0
    })
}

// Группировка маркеров по национальным проектам
const groupedMarkers = computed(() => {
  const groups: Record<string, Marker[]> = {}

  filteredMarkers.value.forEach((marker) => {
    const npName = marker.np_name || 'Без национального проекта'
    if (!groups[npName]) {
      groups[npName] = []
    }
    groups[npName].push(marker)
  })

  return groups
})

// Определяем, должны ли отображаться кластеры
const shouldShowClusters = computed(() => {
  // Всегда показываем кластеры, если зум меньше 17
  return currentZoom.value < 17
})

// Обработчик изменения зума
const handleZoomChange = (zoom: number) => {
  currentZoom.value = zoom
}

// Переключение fullscreen
const toggleFullscreen = () => {
  if (isFullscreen.value) {
    document.exitFullscreen()
  } else {
    map.value?.container.requestFullscreen()
  }
}

// Открытие/закрытие попапа
const togglePopup = (index: number) => {
  openMarker.value = openMarker.value === index ? null : index
}

// Генерация SVG для маркера
const generateMarkerSvg = (marker: Marker): string => {
  const colorFill = marker.is_ready ? marker.iconColor : '#fff'
  const color = marker.iconColor
  const strokeColor = marker.is_ready ? 'none' : marker.iconColor
  const strokeWidth = '1'
  if (marker.is_ready) {
    return `
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="41" viewBox="0 0 33 26"
    fill="${colorFill}"
    stroke="${strokeColor}" stroke-width="${strokeWidth}">
      <g>
        <path d="M11.9107 3.29968L4.28382 19.7018C4.20024 19.8696 4.36741 20.0584 4.55547 19.9954L28.46 11.27C28.5436 11.249 28.6063 11.1651 28.6063 11.0812V3.38357C28.6063 3.25773 28.5018 3.17383 28.3973 3.17383H12.0988C12.0152 3.17383 11.9525 3.21578 11.9107 3.29968Z"
        fill="${color}" />
      </g>
    </svg>
  `
  } else {
    return `
    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="37" viewBox="0 0 33 26"
    fill="${color}"
    stroke="${strokeColor}" stroke-width="${strokeWidth}">
      <defs>
        <pattern id="diagonalHatch${strokeColor}" patternUnits="userSpaceOnUse" width="4" height="4">
          <path d="M-1,1 l2,-2
                  M0,4 l4,-4
                  M3,5 l2,-2"
                style="stroke:${strokeColor}; stroke-width:${strokeWidth}" />
        </pattern>
      </defs>
      <g>
        <path d="M11.9107 3.29968L4.28382 19.7018C4.20024 19.8696 4.36741 20.0584 4.55547 19.9954L28.46 11.27C28.5436 11.249 28.6063 11.1651 28.6063 11.0812V3.38357C28.6063 3.25773 28.5018 3.17383 28.3973 3.17383H12.0988C12.0152 3.17383 11.9525 3.21578 11.9107 3.29968Z"
        fill="url(#diagonalHatch${strokeColor})" />
      </g>
    </svg>
  `
  }
}

// Генерация SVG для кластера
const generateClusterSvg = (count: number, color: string = '#888888'): string => {
  const strokeWidth = '1'
  const textColor = 'white'
  const textOutline = 'rgba(0, 0, 0, 0.7)'
  return `
    <div style="position: relative; width: 48px; height: 41px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="41" viewBox="0 0 33 26"
      fill="${color}"
      stroke="${color}" stroke-width="${strokeWidth}">
        <g>
          <path d="M11.9107 3.29968L4.28382 19.7018C4.20024 19.8696 4.36741 20.0584 4.55547 19.9954L28.46 11.27C28.5436 11.249 28.6063 11.1651 28.6063 11.0812V3.38357C28.6063 3.25773 28.5018 3.17383 28.3973 3.17383H12.0988C12.0152 3.17383 11.9525 3.21578 11.9107 3.29968Z"
          fill="${color}" />
        </g>
      </svg>
      <div style="
        position: absolute;
        top: 35%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: ${textColor};
        font-weight: bold;
        font-size: 14px;
        text-shadow: 1px 1px 2px ${textOutline};
        min-width: 20px;
        text-align: center;
        pointer-events: none;
      ">
        ${count}
      </div>
    </div>
  `
}

// Геодекодирование и фильтрация маркеров вне Ульяновской области
const successfulMarkers = ref<Marker[]>([])
const failedMarkers = ref<Marker[]>([])
const apiKey = 'f31c485f-6573-485a-bcb8-fade4c9ba787'

const isWithinUlyanovskRegion = (lat: number, lon: number): boolean => {
  const minLat = 54.0431
  const maxLat = 54.6793
  const minLon = 47.8372
  const maxLon = 48.7361

  return lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon
}

const getCoordinates = async (address: string): Promise<[number, number] | null> => {
  const urlGeo = 'https://geocode-maps.yandex.ru/1.x/'
  const url = `${urlGeo}?geocode=${address.replace(/ /g, '+')}&apikey=${apiKey}&format=json`

  try {
    const response = await fetch(url)
    const data = await response.json()

    if (!data?.response?.GeoObjectCollection?.featureMember?.length) return null

    const coordsStr = data.response.GeoObjectCollection.featureMember[0].GeoObject.Point.pos
    const [lon, lat] = coordsStr.split(' ').map(Number)

    if (isWithinUlyanovskRegion(lat, lon)) return [lat, lon]
    else return null
  } catch (error) {
    console.error('Ошибка геодекодирования:', error)
    return null
  }
}
watchEffect(() => {
  applyFilters()
})

const handleFullscreenChange = async () => {
  isFullscreen.value = !!document.fullscreenElement
}

onMounted(async () => {
  // Обработка геодекодирования
  for (const marker of markerList) {
    if (!marker.coordinates && marker.address) {
      const coords = await getCoordinates('Ульяновская область' + marker.address)
      if (coords) {
        marker.coordinates = coords
        successfulMarkers.value.push(marker)
      } else {
        failedMarkers.value.push(marker)
        console.error(`Ошибка геодекодирования адреса: ${marker.address}`)
      }
    }
  }

  console.log('Успешные маркеры:', successfulMarkers.value)

  document.addEventListener('fullscreenchange', handleFullscreenChange)

  nextTick(() => {
    // Установка значений по умолчанию для фильтров
    // По умолчанию выбираем все значения, поэтому оставляем пустой массив
    applyFilters()
  })
})

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
})
</script>

<style>
.filter-container {
  max-width: 494px;
  width: fit-content;
}
.years {
  max-width: 160px;
  width: 100%;
}
.read-the-docs {
  color: #888;
}
.fullscreen {
  width: 26px;
  height: 26px;

  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='26' height='26'%3E%3Cg fill='%236B6B6B'%3E%3Cpath d='M16.14 7.86L14.27 6H20v5.7l-1.83-1.82L15.04 13 13 10.98l3.13-3.13zm0 0M9.86 18.14L11.73 20H6v-5.7l1.83 1.82L10.96 13 13 15.02l-3.13 3.13zm0 0'/%3E%3C/g%3E%3C/svg%3E");
}

.exit-fullscreen {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='26' height='26'%3E%3Cg fill='%236B6B6B'%3E%3Cpath d='M8.14 15.86L6.27 14H12v5.7l-1.83-1.83-3.13 3.14L5 18.98l3.13-3.13zm0 0M17.86 10.14L19.73 12H14V6.3l1.83 1.83 3.13-3.14L21 7.02l-3.13 3.13zm0 0'/%3E%3C/g%3E%3C/svg%3E");
}

.cluster-marker {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 50px;
  height: 50px;
  cursor: pointer;
}
</style>
