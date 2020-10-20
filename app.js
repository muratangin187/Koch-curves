"use strict";

let canvas;
let gl;
// constant size for creating a buffer on gpu
let maxNumVertices  = 100000;
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
// boolean variable controls whether fill polygon or just draw lines
let fillPolygon = false;
// uniform fillColor value and location variables
let fillColor = vec4(1.0, 0.34, 0.34, 1.0);
let fillColorLocation;
// backgroundColor value variable, there is no location variable because it determined in gl.clearColor
let backgroundColor = vec4(0.13, 0.13, 0.13, 1.0);
// vertexBufferId in order to access vertex buffer to change data inside it.
let vertexBufferId;
// step count for recursive Koch algorithm
let stepCount = 0;
// check algorithm started or not
let isStarted = false;
let program;
// used for pretty printing function names in webgl debug mode
function logGLCall(functionName, args) {
    console.log("gl." + functionName + "(" +
        WebGLDebugUtils.glFunctionArgsToString(functionName, args) + ")");
}

function initializeValues(){
    maxNumVertices  = 100000;
    indices = [];
    firstVertexPos = undefined;
    lastVertexPos = undefined;
    donePolygon = false;
    fillPolygon = false;
    fillColor = vec4(1.0, 0.34, 0.34, 1.0);
    fillColorLocation = undefined;
    backgroundColor = vec4(0.13, 0.13, 0.13, 1.0);
    vertexBufferId = undefined;
    stepCount = 0;
    isStarted = false;
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
    return vec4(redNormalized, greenNormalized, blueNormalized);
}

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

function initializeAlgorithm(){
    createVertexBuffer(8 * maxNumVertices); // TODO
    curveIndices = [];
    for (let i = 0; i < indices.length-1; i++){
        let firstVertex = indices[i];
        let secondVertex = indices[i+1];
        createKochCurve(firstVertex, secondVertex, stepCount);
    }
    curveIndices.push(indices[indices.length-1]);
    gl.bindBuffer( gl.ARRAY_BUFFER, vertexBufferId );
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(curveIndices));
}

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
    gl = WebGLUtils.setupWebGL( canvas );
    // for enable debug
    //gl = WebGLDebugUtils.makeDebugContext(gl, undefined, logGLCall);
    if ( !gl ) { alert( "WebGL isn't available" ); }
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor(flatten(backgroundColor)[0], flatten(backgroundColor)[1], flatten(backgroundColor)[2], flatten(backgroundColor)[3]);
    gl.clear( gl.COLOR_BUFFER_BIT );
    //
    //  Load shaders and initialize attribute buffers
    //

    createVertexBuffer(8 * maxNumVertices);

    render();
}

// initialize listeners for ui elements and canvas actions(mouse, keyboard, etc.)
function initializeListeners(){
    document.getElementById("fillCheck").addEventListener("change", (event)=>{
        fillPolygon = event.target.checked;
    });

    document.getElementById("resetCanvas").addEventListener("click", (event)=>{
        initializeValues();
        document.getElementById("fillColor").value = "#ff5757";
        document.getElementById("backgroundColor").value = "#333333";
        initializeWebGl();
    });

    document.getElementById("startAlgorithm").addEventListener("click", (event)=>{
        if(isStarted){
            // stop algorithm
            isStarted = false;
            initializeAlgorithm();
            document.getElementById("startAlgorithm").innerText = "Start Koch Algorithm";
        }else{
            // start algorithm
            isStarted = true;
            initializeAlgorithm();
            document.getElementById("startAlgorithm").innerText = "Stop Koch Algorithm";
        }
    });

    document.getElementById("fillColor").addEventListener("input",event => {
        fillColor = normalizeColor(event.target.value);
        gl.uniform4fv(fillColorLocation, flatten(fillColor));
    });

    document.getElementById("backgroundColor").addEventListener("input",event => {
        backgroundColor = normalizeColor(event.target.value);
        gl.clearColor(flatten(backgroundColor)[0], flatten(backgroundColor)[1], flatten(backgroundColor)[2], flatten(backgroundColor)[3]);
        gl.clear( gl.COLOR_BUFFER_BIT );
    });

    document.getElementById("stepCount").onchange = event => {
        stepCount = parseInt(event.target.value);
    };

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
                document.getElementById("startAlgorithm").removeAttribute("disabled");
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

// starting point of application, fired after loading of page finished
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
    if(isStarted){
        gl.drawArrays( fillPolygon ? gl.TRIANGLE_FAN : gl.LINE_STRIP, 0, curveIndices.length);
    }else{
        if(lastVertexPos && !donePolygon)
            gl.drawArrays( fillPolygon ? gl.TRIANGLE_FAN : gl.LINE_STRIP, 0, indices.length+1);
        else
            gl.drawArrays( fillPolygon ? gl.TRIANGLE_FAN : gl.LINE_STRIP, 0, indices.length);
    }
    window.requestAnimationFrame(render);
}
