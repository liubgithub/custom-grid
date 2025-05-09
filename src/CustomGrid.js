import * as maptalks from 'maptalks';
import * as THREE from 'three';
import { ThreeLayer } from 'maptalks.three';
const pos = new THREE.Vector3(0, 0, 0);
export default class CustomGrid {
    constructor(options) {
        this.options = options;
        this._heightMap = {};
        this._initGrid();
        this.materialShader = null;
        this.material = new THREE.LineBasicMaterial({
            linewidth: 1,
            color: 0xffffff,
            opacity: 0.8,
            transparent: true
        });
        this.material.onBeforeCompile = (shader) => {
            this.materialShader = shader;
            // 添加最大距离和最小距离作为uniform
            shader.uniforms.maxDistance = { value: 6.0 };
            shader.uniforms.minDistance = { value: 0.0 };
            // 添加自定义相机位置uniform
            shader.uniforms.cameraPosition = { value: pos };
            
            // 修改顶点着色器，传递世界坐标到片元着色器
            shader.vertexShader = shader.vertexShader.replace(
                'void main() {',
                `
                varying vec3 vWorldPosition;
                void main() {
                    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                `
            );
            
            // 修改片元着色器，基于距离计算透明度
            shader.fragmentShader = shader.fragmentShader.replace(
                'void main() {',
                `
                uniform float maxDistance;
                uniform float minDistance;
                varying vec3 vWorldPosition;
                void main() {
                `
            );
            
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <color_fragment>',
                `
                #include <color_fragment>
                
                // 计算片元到相机的距离，使用自定义相机位置
                float distance = length(vWorldPosition - cameraPosition);
                
                // 计算基于距离的透明度
                // 距离越远，透明度越高（alpha越低）
                float alpha = 1.0 - clamp((distance - minDistance) / (maxDistance - minDistance), 0.0, 1.0);
                
                // 应用透明度
                diffuseColor.a *= alpha;
                `
            );
            
            // material.userData.shader = shader;
        };
    }

    addTo(groupglLayer) {
        this._linestringlayer.addTo(groupglLayer);
        this._map = groupglLayer.getMap();
        if (!this._map) {
            throw new Error('groupgllayer should add to a map first.');
        }
        this._map.on('zoomend', this._zoomEnd.bind(this));
    }

    show() {
        this._linestringlayer.show();
    }

    hide() {
        this._linestringlayer.hide();
    }

    getLayer() {
        return this._linestringlayer;
    }

    remove() {
        this._linestringlayer.remove();
    }

    clear() {
        this._linestringlayer.clear();
    }

    updateLine(lineUrl, pointUrl) {
        this.options.lineUrl = lineUrl;
        this.options.pointUrl = pointUrl;
        this._linestringlayer.clear();
        this._fetchHorizonLine(lineUrl);
    }

    _initGrid() {
        this._linestringlayer = new ThreeLayer('three', {
            forceRenderOnMoving: true,
            forceRenderOnRotating: true
            // animation: true
        });
        this._linestringlayer.prepareToDraw = function (gl, scene) {
            var light = new THREE.DirectionalLight(0xffffff);
            light.position.set(0, -10, 10).normalize();
            scene.add(light);
            scene.fog = new THREE.FogExp2( 0xffffff, 0.00025);
        };

        this._linestringlayer.on('renderstart', () => {
            const map = this._linestringlayer.getMap();
            if (this.materialShader && map) {
                const cPos = map.cameraPosition;
                this.materialShader.uniforms.cameraPosition.value.copy(new THREE.Vector3(cPos[0], cPos[1], cPos[2]));
            }
        });
        this._createHeightMap();
        this._fetchHorizonLine(this.options.lineUrl);
    }

    _createHeightMap() {
        const floorNum = this.options.floorNum || 26;
        for (let i = 0; i < floorNum; i++) {
            this._heightMap[i] = i * 7.76;
        }
    }

    _zoomEnd() {
        const cameraHeight = this._map.cameraPosition[2] / (this._map.altitudeToPoint(1, this._map.getGLRes()));
        let index = this._findIndex(cameraHeight);
        index = index > 4 ? index : 4;
        const floorNum = this.options.floorNum || 26;
        if (index > floorNum * 5) {
            this._linestringlayer.hide();
        } else {
            this._linestringlayer.show();
        }
        const lines = this._linestringlayer.getMeshes();
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const level = line.mapLevel;
            if (level === undefined) {
                // const coords = line.getCoordinates();
                // const coord0 = coords[0];
                // const coord1 = coords[1];
                // coord0.z = (index - 4) * 7.76;
                // coord1.z = index * 7.76;
                // line.setCoordinates([coord0, coord1]);
                continue;
            }
            if (level <= index && level > index - 5) {
                line.visible = true;
            } else {
                line.visible = false;
            }
        }
    }

    _fetchHorizonLine(url) {
        fetch(url)
    .then(response => response.json())
    .then(data => {
        const features = data.features;
        const floorNum = this.options.floorNum || 26;
        for (let floorIdx = 0; floorIdx < floorNum; floorIdx++) {
            const coordinates = [];
            for (let i = 0; i < features.length; i++) {
                const line = features[i].geometry.coordinates;
                const from = line[0];
                const to = line[1];
                const newLine = [[from[0], from[1], floorIdx * 7.76], [to[0], to[1], floorIdx * 7.76]];
                coordinates.push(newLine);
            }
            const totalLine = new maptalks.MultiLineString(coordinates);
            const line = this._linestringlayer.toLine(totalLine, { altitude: 0 }, this.material);
            line.mapLevel = floorIdx;
            if (this._linestringlayer.getScene()) {
                this._linestringlayer.addMesh(line);
            }
        }
        this._fetchVerticalLine(this.options.pointUrl);
    });
    }

    _fetchVerticalLine(url) {
        fetch(url)
        .then(response => response.json())
        .then(data => {
            const coordinates = [];
            const features = data.features;
            // const cameraHeight = this._map.cameraPosition[2] / (this._map.altitudeToPoint(1, this._map.getGLRes()));
            // let index = this._findIndex(cameraHeight);
            for (let i = 0; i < features.length; i++) {
                const coord = features[i].geometry.coordinates;
                const coords = [
                    [coord[0], coord[1], 0],
                    [coord[0], coord[1], 7.76 * (this.options.floorNum - 1)]
                ];
                coordinates.push(coords);
            }
            const totalLine = new maptalks.MultiLineString(coordinates);
            const line = this._linestringlayer.toLine(totalLine, { altitude: 0 }, this.material);
            if (this._linestringlayer.getScene()) {
                this._linestringlayer.addMesh(line);
            }
        });
    }

    _findIndex(height) {
        const floorNum = this.options.floorNum || 26;
        const heightMap = this._heightMap;
        for (let i = 0; i < floorNum; i++) {
            if (heightMap[i] >= height && heightMap[i - 1] <= height) {
                return i - 1;
            }
        }
        return Math.floor(height / 7.76);
    }
}