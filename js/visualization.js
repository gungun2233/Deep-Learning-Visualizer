// Initialize variables and constants
var input_hide = false, conv1_hide = false, down1_hide = false, conv2_hide = false, down2_hide = false, fc1_hide = false, fc2_hide = false, output_hide = false;
var input_was_hidden = false, conv1_was_hidden = false, down1_was_hidden = false, conv2_was_hidden = false, down2_was_hidden = false, fc1_was_hidden = false, fc2_was_hidden = false, output_was_hidden = false;

var rotatingCam = false;
var container, stats, gl;
var camera, controls, scene, renderer;
var pickingData = [], pickingTexture, pickingScene;
var objects = [];
var highlightBox;
var allZeroes = true;

var nPixels = 32 * 32;
var nConvNodes_1 = 28 * 28 * 6;
var nConvNodes_1_down = 14 * 14 * 6;
var nConvNodes_2 = 10 * 10 * 16;
var nConvNodes_2_down = 5 * 5 * 16;
var filterSize_1 = 5;
var filterSize_2 = 5;
var nConvFilters_1 = 6;
var nConvFilters_2 = 16;
var nConvLayers = 2;
var nHiddenNodes_1 = 120;
var nHiddenNodes_2 = 100;
var nHiddenLayers = 2;
var nFinalNodes = 10;
var nNodes = nPixels + nConvNodes_1 + nConvNodes_1_down + nConvNodes_2 + nConvNodes_2_down + nHiddenNodes_1 + nHiddenNodes_2 + nFinalNodes;
console.log('nNodes = ' + nNodes);
var allNodeNums = new Array(nNodes);
var allNodeInputs = new Array(nNodes);
var allNodeOutputs = new Array(nNodes);
var allNodeOutputsRaw = new Array(nNodes);
var finalOutputID = 0;
var isComputed = false;
var goodStart = false;
var hidden_weights_1a, hidden_weights_2a, final_weightsa;
var conv_weights_1a;
var conv_weights_2a;

var keeperIndices;
var nKeepers;

var interID, row, col, ind_below;
var intersected = false;

var posX = [], posY = [], posZ = [], layerNum = [];

var originalWidth = window.innerWidth;
var originalHeight = window.innerHeight;

var mouse = new THREE.Vector2();
var mousepx = new THREE.Vector2();

var filterNum, filterNum_below;
var nodeType;
var inputCanvasContainer = document.getElementById("inputCanvasContainer");
var filterCanvasContainer = document.getElementById("filterCanvasContainer");
var inputCanvas = document.getElementById("inputCanvas");
var filterCanvas = document.getElementById("filterCanvas");
var inputCtx = inputCanvas.getContext("2d");
var filterCtx = filterCanvas.getContext("2d");

var nums = "0 1 2 3 4 5 6 7 8 9",
    height = 1,
    size = 9,
    hover = 460,

    curveSegments = 8,
    
    bevelThickness = 2,
    bevelSize = 1.5,
    bevelSegments = 3,
    bevelEnabled = false,

    font = "droid sans", // helvetiker, optimer, gentilis, droid sans, droid serif
    weight = "normal", // normal bold
    style = "normal"; // normal italic

var customBoard = new DrawingBoard.Board('custom-board', {
    background: "#000",
    color: "#fff",
    size: 30,
    controls: [
        { Navigation: { back: false, forward: false } },
        { DrawingMode: { filler: false } }
    ],
    controlsPosition: "bottom right",
    webStorage: 'session',
    droppable: false
});

var tinyCtx = $("#tiny")[0].getContext("2d");
tinyCtx.scale(0.1, 0.1);

init();
loadData();
animate();

function init() {			
    container = document.getElementById("webgl_container");
    
    scene = new THREE.Scene();
    var aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.OrthographicCamera(-680 * aspect, 680 * aspect, 600, -760, -100, 50); 
    scene.add(camera);

    pickingScene = new THREE.Scene();
    pickingTexture = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
    pickingTexture.minFilter = THREE.LinearFilter;
    pickingTexture.generateMipmaps = false;

    var light = new THREE.SpotLight(0xffffff, 1.5);
    light.name = "light";
    light.position.set(0, 500, 2000);
    scene.add(light);
    var light2 = new THREE.SpotLight(0xffffff, 0.5);
    light2.name = "light";
    light2.position.set(0, 200, -1000);
    scene.add(light2);
    var light3 = new THREE.AmbientLight(0xcccccc);
    light3.name = "light";
    scene.add(light3);

    highlightBox = new THREE.Mesh(
        new THREE.BoxGeometry(12, 12, 12),
        new THREE.MeshLambertMaterial({ color: 0xffff00 })
    );
    highlightBox.visible = false;
    scene.add(highlightBox);

    hideInputBox = new THREE.Mesh(
        new THREE.BoxGeometry(340, 20, 340),
        new THREE.MeshLambertMaterial({ color: 0x00ff00, transparent: true, opacity: 0.1 })
    );
    hideInputBox.position.set(0, -250, 0);
    hideInputBox.visible = true;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.sortObjects = false;
    container.appendChild(renderer.domElement);

    var cameraControls;
    cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
    cameraControls.target.set(0, 0, 0);

    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    container.appendChild(stats.domElement);

    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('click', onClick);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    window.addEventListener('resize', onWindowResize, false);
    
    getNNOutput();
}

function hideCubes() {
    var i, id;
    
    var cubeAdjust = 4;
    var numChildren = scene.children.length;
    for (i = 0; i < numChildren; i++) {
        if (scene.children[i].name == 'cubes') {
            var object = scene.children[i];
            var geometry = object.geometry;
            
            if (!input_hide && input_was_hidden) {
                adjustRangeOfCubes(geometry, 1, nPixels, -cubeAdjust);
                input_was_hidden = false;
            } else if (input_hide && !input_was_hidden) {
                adjustRangeOfCubes(geometry, 1, nPixels, cubeAdjust);
                input_was_hidden = true;
            }

            if (!conv1_hide && conv1_was_hidden) {
                adjustRangeOfCubes(geometry, nPixels + 1, nPixels + nConvNodes_1, -cubeAdjust);
                conv1_was_hidden = false;
            } else if (conv1_hide && !conv1_was_hidden) {
                adjustRangeOfCubes(geometry, nPixels + 1, nPixels + nConvNodes_1, cubeAdjust);
                conv1_was_hidden = true;
            }

            if (!down1_hide && down1_was_hidden) {
                adjustRangeOfCubes(geometry, nPixels + nConvNodes_1 + 1, nPixels + nConvNodes_1 + nConvNodes_1_down, -cubeAdjust);
                down1_was_hidden = false;
            } else if (down1_hide && !down1_was_hidden) {
                adjustRangeOfCubes(geometry, nPixels + nConvNodes_1 + 1, nPixels + nConvNodes_1 + nConvNodes_1_down, cubeAdjust);
                down1_was_hidden = true;
            }

            if (!conv2_hide && conv2_was_hidden) {
                adjustRangeOfCubes(geometry, nPixels + nConvNodes_1 + nConvNodes_1_down + 1, nPixels + nConvNodes_1 + nConvNodes_1_down + nConvNodes_2, -cubeAdjust);
                conv2_was_hidden = false;
            } else if (conv2_hide && !conv2_was_hidden) {
                adjustRangeOfCubes(geometry, n