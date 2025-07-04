<!-- eslint-disable no-unused-vars -->
<template>
  <div id="map"></div>
</template>

<script>
import * as maptalks from 'maptalks-gl';
// import { Map, TileLayer, GroupGLLayer, GLTFLayer, GLTFMarker } from 'maptalks-gl';
// import CustomGrid from './CustomGrid.js';

export default {
  name: 'App',
  components: {
  },
  mounted() {
    this.initMap();
  },
  methods: {
    initMap() {
      const map = new maptalks.Map("map", {
            center: [120.20500129, 30.24393521],
            zoom: 17,
            bearing: 157,
            pitch: 80,
            lights: {
                ambient: {
                    color: [1, 1, 1],
                    exposure: 1.5
                },
                directional: {
                    color: [1.0, 1, 1],
                    direction: [1, 0, -0.2]
                }
            },
            baseLayer: new maptalks.TileLayer('baseLayer', {
                spatialReference: {
                    projection: 'EPSG:4326'
                },
                //maxZoom:18,
                maxAvailableZoom: 18, //maptalks新加入的特性
                tileSystem: [1, -1, -180, 90],
                urlTemplate: function (x, y, z) {
                    return `https://www.hyznb.cn/iismap/zjTiles/${z - 1}/${x}/${y}.png`;
                } //211服务器上的谷歌底图
            })
      });
      const gltflayer = new maptalks.GLTFLayer('gltf');
      const gltfmarker = new maptalks.GLTFMarker(map.getCenter(), {
        symbol: {
          url: 'http://localhost/zg/drone-normal.glb',
          modelHeight: 100
        }
      });
      gltfmarker.addTo(gltflayer);
      const groupLayer = new maptalks.GroupGLLayer("group", [gltflayer], {
            sceneConfig: {
                environment: {
                    enable: true,
                    mode: 1,
                    level: 0,
                    brightness: 0
                },
                postProcess: {
                    enable: true,
                    antialias: {
                        enable: true,
                    },
                    taa: {
                        enable: true,
                    },
                    bloom: {
                        enable: true,
                        threshold: 0,
                        factor: 0.1,
                        radius: 0.05,
                    }
                },
            },
          });
      groupLayer.addTo(map);
      // const mygrid = new CustomGrid({
      //     lineUrl: 'http://localhost/geojson/网格线_0418.geojson',//网格线geojson的地址
      //     pointUrl: 'http://localhost/geojson/网格点_0418.geojson',//网格点geojson的地址
      //     floorNum: 26//楼层数
      // });
      // mygrid.addTo(groupLayer);
    }
  }
}
</script>

<style>
html,body {
  margin:0px;
  width: 100%;
  height: 100%;
}
#app {
  width: 100%;
  height: 100%;
}
#map {
  width: 100%;
  height: 100%;
}
</style>
