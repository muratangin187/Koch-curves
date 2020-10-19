"use strict";

let canvas;
let gl;
let maxNumVertices  = 200;
let t;
let numIndices = 0;
let firstVertexPos;
let lastVertexPos;
let donePolygon = false;
let fillPolygon = false;
let fillColor = vec4(0.0, 0.0, 0.0, 1.0);
let fillColorLocation;

function logGLCall(functionName, args) {
    console.log("gl." + functionName + "(" +
        WebGLDebugUtils.glFunctionArgsToString(functionName, args) + ")");
}

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

window.onload = function init() {
    canvas = document.getElementById( "myCanvas" );
    gl = WebGLUtils.setupWebGL( canvas );
    // for enable debug
    //gl = WebGLDebugUtils.makeDebugContext(gl, undefined, logGLCall);
    if ( !gl ) { alert( "WebGL isn't available" ); }
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.8, 0.8, 0.8, 1.0 );
    gl.clear( gl.COLOR_BUFFER_BIT );
    render();

    document.getElementById("fillButton").addEventListener("click", (event)=>{
        fillPolygon = !fillPolygon;
    });

    document.getElementById("fillColor").addEventListener("input",event => {
        fillColor = normalizeColor(event.target.value);
        gl.uniform4fv(fillColorLocation, flatten(fillColor));
    });
   
    canvas.addEventListener("mousedown", function(event){
        if(donePolygon) return;
        let clipCoordX = 2 * event.clientX / canvas.width - 1;
        let clipCoordY = 2 * (canvas.height - event.clientY) / canvas.height - 1;
        t  = vec2(clipCoordX, clipCoordY);

        if(!firstVertexPos){
            firstVertexPos = t
        }else{
            let vecFromFirst = subtract(firstVertexPos, t);
            if(length(vecFromFirst) < 0.05){
                // so close, joins them
                t = firstVertexPos;
                donePolygon = true;
            }
        }

        lastVertexPos = t;

        gl.bindBuffer( gl.ARRAY_BUFFER, vertexBufferId );
        gl.bufferSubData(gl.ARRAY_BUFFER, 8*numIndices, flatten(t));

        numIndices++;
        drawPreviewLine(event);
    } );

    function drawPreviewLine(event){
        if(donePolygon) return;
        if(!lastVertexPos) return;

        let clipCoordX = 2 * event.clientX / canvas.width - 1;
        let clipCoordY = 2 * (canvas.height - event.clientY) / canvas.height - 1;

        let t = vec2(clipCoordX, clipCoordY);
        //t = subtract(t, lastVertexPos);

        gl.bindBuffer( gl.ARRAY_BUFFER, vertexBufferId );
        gl.bufferSubData(gl.ARRAY_BUFFER, 8*(numIndices), flatten(t));
    }

    canvas.addEventListener("mousemove", function(event){
        drawPreviewLine(event);
    });

    //
    //  Load shaders and initialize attribute buffers
    //
    let program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    let vertexBufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vertexBufferId );
    gl.bufferData( gl.ARRAY_BUFFER, 8*maxNumVertices, gl.STATIC_DRAW );
    let vPos = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPos, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPos );
    fillColorLocation = gl.getUniformLocation(program, "fillColor");
}

function render() {

    if(numIndices < 1){
        window.requestAnimationFrame(render);
        return;
    }
    gl.clear( gl.COLOR_BUFFER_BIT );
    if(lastVertexPos && !donePolygon)
        gl.drawArrays( fillPolygon ? gl.TRIANGLE_FAN : gl.LINE_STRIP, 0, numIndices+1);
    else
        gl.drawArrays( fillPolygon ? gl.TRIANGLE_FAN : gl.LINE_STRIP, 0, numIndices);
    window.requestAnimationFrame(render);
}
