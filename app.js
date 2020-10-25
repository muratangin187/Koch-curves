"use strict";

// variables used in webgl processes
let canvas;
let gl;
let program;
// indices of current polygon
let indices = [];
// indices of calculated Koch curve after algorithm applied.
let curveIndices = [];
// First vertex position used to check lastly added point is close or not
let firstVertexPos;
// Last vertex position used to draw preview line when mouse moves
let lastVertexPos;
// boolean variable disable drawing after connect starting and end point of a polygon
let donePolygon = false;
// uniform fillColor value and location variables
let fillColor = vec4(1.0, 0.34, 0.34, 1.0);
let fillColorLocation;
// backgroundColor value variable, there is no location variable because it determined in gl.clearColor
let backgroundColor = vec4(0.13, 0.13, 0.13, 1.0);
// vertexBufferId in order to access vertex buffer to change data inside it.
let vertexBufferId;
// step count for recursive Koch algorithm
let stepCount = 0;
// used for pretty printing function names in webgl debug mode
function logGLCall(functionName, args) {
    console.log("gl." + functionName + "(" +
        WebGLDebugUtils.glFunctionArgsToString(functionName, args) + ")");
}

// initialize variables at the beginning of the program or after importing a new canvas
function initializeValues(){
    indices = [];
    curveIndices = [];
    firstVertexPos = undefined;
    lastVertexPos = undefined;
    donePolygon = false;
    fillColor = vec4(1.0, 0.34, 0.34, 1.0);
    fillColorLocation = undefined;
    backgroundColor = vec4(0.13, 0.13, 0.13, 1.0);
    vertexBufferId = undefined;
    stepCount = 0;
}

// helper function converts a hex color input(ex #ff0f2f) to a vec4 with r,g,b,1 values
function normalizeColor(rawColor){
    let redHex = rawColor.substring(1,3);
    let greenHex = rawColor.substring(3,5);
    let blueHex = rawColor.substring(5,7);
    let redDec = parseInt(redHex, 16);
    let greenDec = parseInt(greenHex, 16);
    let blueDec = parseInt(blueHex, 16);
    let redNormalized = redDec / 255;
    let greenNormalized = greenDec / 255;
    let blueNormalized = blueDec / 255;
    return vec4(redNormalized, greenNormalized, blueNormalized, 1);
}

// helper function converts a vec4 with r,g,b,1 values to a hex color input(ex #ff0f2f)
function toHex(vectorColor){
    let redHex = (vectorColor[0] * 255).toString(16);
    let greenHex = (vectorColor[1] * 255).toString(16);
    let blueHex = (vectorColor[2] * 255).toString(16);
    if(redHex.length < 2)
        redHex = "0" + redHex;
    if(greenHex.length < 2)
        greenHex = "0" + greenHex;
    if(blueHex.length < 2)
        blueHex= "0" + blueHex;
    let result = "#" + redHex + greenHex + blueHex;
    return result;
}

// calculate new curves(new lines) according to start and end vertex of a line and
// push them into an array called curveIndices
function createKochCurve(firstVertex, secondVertex, iteration){
    if(iteration == 0){
        curveIndices.push(firstVertex);
    }else{
        let vertex1 = firstVertex;
        let vertex9 = secondVertex;
        let rz = mat3(0, -1, 0, 1, 0, 0, 0, 0, 1);
        let unitRightVector = scale(1/4, subtract(vertex9, vertex1));
        let unitTopVector = mult(rz, vec3(unitRightVector[0], unitRightVector[1], 1));
        // convert vec3 to vec2
        unitTopVector = vec2(unitTopVector[0], unitTopVector[1]);
        let unitBottomVector = negate(unitTopVector);

        let vertex2 = add(vertex1, unitRightVector);
        let vertex3 = add(vertex2, unitTopVector);
        let vertex4 = add(vertex3, unitRightVector);
        let vertex5 = add(vertex4, unitBottomVector);
        let vertex6 = add(vertex5, unitBottomVector);
        let vertex7 = add(vertex6, unitRightVector);
        let vertex8 = add(vertex7, unitTopVector);

        createKochCurve(vertex1, vertex2, iteration - 1);
        createKochCurve(vertex2, vertex3, iteration - 1);
        createKochCurve(vertex3, vertex4, iteration - 1);
        createKochCurve(vertex4, vertex5, iteration - 1);
        createKochCurve(vertex5, vertex6, iteration - 1);
        createKochCurve(vertex6, vertex7, iteration - 1);
        createKochCurve(vertex7, vertex8, iteration - 1);
        createKochCurve(vertex8, vertex9, iteration - 1);
    }
}

// empty result indice array(curveIndices) and iterate for every edge of polygon, send
// these edges to createKochCurve algorithm. At the end, send result vertices to gpu buffer
function initializeAlgorithm(){
    curveIndices = [];
    for (let i = 0; i < indices.length-1; i++){
        let firstVertex = indices[i];
        let secondVertex = indices[i+1];
        createKochCurve(firstVertex, secondVertex, stepCount);
    }
    curveIndices.push(indices[indices.length-1]);
    createVertexBuffer(8 * curveIndices.length); // TODO
    gl.bindBuffer( gl.ARRAY_BUFFER, vertexBufferId );
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(curveIndices));
}

// if there is an vertex buffer created already delete it, create a new webgl program, create a vertex
// buffer and use it on new program, create location for fillColor uniform on the new program
function createVertexBuffer(size){
    if(vertexBufferId){
        // if vertexBufferId exists, it means there is a buffer created already. Then remove it.
        gl.deleteBuffer(vertexBufferId);
    }else{
        program = initShaders( gl, "vertex-shader", "fragment-shader" );
        gl.useProgram( program );
    }
    vertexBufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vertexBufferId );
    gl.bufferData( gl.ARRAY_BUFFER, size, gl.STATIC_DRAW );
    let vPos = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPos, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPos );
    fillColorLocation = gl.getUniformLocation(program, "fillColor");
    gl.uniform4fv(fillColorLocation, flatten(fillColor));
}

// initialize webgl and viewport then clear canvas and start render loop
function initializeWebGl(){
    canvas = document.getElementById( "myCanvas" );
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    gl = WebGLUtils.setupWebGL( canvas );
    // for enable debug
    //gl = WebGLDebugUtils.makeDebugContext(gl, undefined, logGLCall);
    if ( !gl ) { alert( "WebGL isn't available" ); }
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor(flatten(backgroundColor)[0], flatten(backgroundColor)[1], flatten(backgroundColor)[2], flatten(backgroundColor)[3]);
    gl.clear( gl.COLOR_BUFFER_BIT );
    //  Load shaders and initialize attribute buffers
    createVertexBuffer(8 * 100);
    // enter the render loop
    render();
}

// Import canvas function, reset every variable and assign new values comes from json data
// Start koch curves algorithm
function importCanvas(jsonData) {
    initializeValues();
    donePolygon = true;
    //document.getElementById("fillColor").value = "#ff5757";
    //document.getElementById("backgroundColor").value = "#333333";
    document.getElementById("stepCount").value = jsonData.stepCount;
    document.getElementById("stepCountLabel").innerText = jsonData.stepCount;
    // update colors according to imported canvas
    document.getElementById("backgroundColor").value = toHex(jsonData.backgroundColor);
    document.getElementById("fillColor").value = toHex(jsonData.fillColor);
    stepCount = jsonData.stepCount;
    fillColor = jsonData.fillColor;
    backgroundColor = jsonData.backgroundColor;
    indices = jsonData.indices;
    initializeWebGl();
    sendIndicesToBuffer();
    initializeAlgorithm();
}

// helper function to send indices to vertex buffer
function sendIndicesToBuffer(){
    for (let i = 0; i < indices.length; i++){
        gl.bindBuffer( gl.ARRAY_BUFFER, vertexBufferId );
        gl.bufferSubData(gl.ARRAY_BUFFER, 8*i, flatten(indices[i]));
    }
}

// initialize listeners for ui elements and canvas actions(mouse, keyboard, etc.)
function initializeListeners(){
    // assign importCanvas function to button, opens a file picker component and call importCanvas
    document.getElementById("importCanvas").addEventListener("change", (event)=>{
        let files = document.getElementById('importCanvas').files;
        if (files.length <= 0) return;

        let fileReader = new FileReader();

        fileReader.onload = e => {
            // we got json data from file
            let jsonData = JSON.parse(e.target.result);
            importCanvas(jsonData);
        }

        fileReader.readAsText(files.item(0));
    });

    // assign export canvas button functions, get current needed values such as background, fillColor,
    // stepCount, indices array for polygon and create a json object with them. Create a link button and click on it
    // in order to start download process in frontend
    document.getElementById("exportCanvas").addEventListener("click", (event)=>{
        const originalData = {
            backgroundColor: backgroundColor,
            fillColor: fillColor,
            stepCount: stepCount,
            indices: indices
        };
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([JSON.stringify(originalData, null, 2)], {
            type: "application/json"
        }));
        a.setAttribute("download", "canvas.json");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    // reset values of canvas and webgl
    document.getElementById("resetCanvas").addEventListener("click", (event)=>{
        initializeValues();
        document.getElementById("fillColor").value = "#ff5757";
        document.getElementById("backgroundColor").value = "#333333";
        document.getElementById("stepCount").value = stepCount;
        document.getElementById("stepCountLabel").innerText = "0";
        initializeWebGl();
    });

    // start algorithm
    document.getElementById("startAlgorithm").addEventListener("click", (event)=>{
        initializeAlgorithm();
    });

    // change color of line, fillColor
    document.getElementById("fillColor").addEventListener("input",event => {
        fillColor = normalizeColor(event.target.value);
        gl.uniform4fv(fillColorLocation, flatten(fillColor));
    });

    // change background color
    document.getElementById("backgroundColor").addEventListener("input",event => {
        backgroundColor = normalizeColor(event.target.value);
        gl.clearColor(flatten(backgroundColor)[0], flatten(backgroundColor)[1], flatten(backgroundColor)[2], flatten(backgroundColor)[3]);
        gl.clear( gl.COLOR_BUFFER_BIT );
    });

    // change step count for algorithm, 1-6
    document.getElementById("stepCount").onchange = event => {
        stepCount = parseInt(event.target.value);
        document.getElementById("stepCountLabel").innerText = stepCount;
    };

    // canvas mousedown event, if the polygon drawing is not done, add a new vertex to vertex buffer
    canvas.addEventListener("mousedown", function(event){
        if(donePolygon) return;
        let clipCoordX = 2 * event.clientX / canvas.width - 1;
        let clipCoordY = 2 * (canvas.height - event.clientY) / canvas.height - 1;
        let resultVertex  = vec2(clipCoordX, clipCoordY);

        if(!firstVertexPos){
            firstVertexPos = resultVertex
        }else{
            let vecFromFirst = subtract(firstVertexPos, resultVertex);
            if(length(vecFromFirst) < 0.05){
                // so close, joins them
                resultVertex = firstVertexPos;
                donePolygon = true;
            }
        }

        lastVertexPos = resultVertex;


        gl.bindBuffer( gl.ARRAY_BUFFER, vertexBufferId );
        gl.bufferSubData(gl.ARRAY_BUFFER, 8*indices.length, flatten(resultVertex));

        indices.push(resultVertex);

        resultVertex = vec2(clipCoordX, clipCoordY);

        gl.bindBuffer( gl.ARRAY_BUFFER, vertexBufferId );
        gl.bufferSubData(gl.ARRAY_BUFFER, 8*(indices.length), flatten(resultVertex));
    } );

    // in order to create a preview of newly added line, in the mousemove event of canvas create a line.
    canvas.addEventListener("mousemove", function(event){
        if(donePolygon) return;
        if(!lastVertexPos) return;

        let clipCoordX = 2 * event.clientX / canvas.width - 1;
        let clipCoordY = 2 * (canvas.height - event.clientY) / canvas.height - 1;

        let resultVertex = vec2(clipCoordX, clipCoordY);
        //t = subtract(t, lastVertexPos);

        gl.bindBuffer( gl.ARRAY_BUFFER, vertexBufferId );
        gl.bufferSubData(gl.ARRAY_BUFFER, 8*(indices.length), flatten(resultVertex));
    });
}

// starting point of application
window.onload = function init() {
    initializeValues();
    initializeWebGl();
    initializeListeners();
}

// render loop handles canvas drawings with webGL
function render() {
    if(indices.length < 1){
        window.requestAnimationFrame(render);
        return;
    }
    gl.clear( gl.COLOR_BUFFER_BIT );
    if(curveIndices.length > 0){
        gl.drawArrays( gl.LINE_STRIP, 0, curveIndices.length);
    }else{
        if(lastVertexPos && !donePolygon)
            gl.drawArrays( gl.LINE_STRIP, 0, indices.length+1);
        else
            gl.drawArrays( gl.LINE_STRIP, 0, indices.length);
    }
    window.requestAnimationFrame(render);
}
