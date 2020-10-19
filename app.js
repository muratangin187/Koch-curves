"use strict";

let canvas;
let gl;
let maxNumVertices  = 200;
let t;
let numIndices = 0;
let firstVertexPos;

window.onload = function init() {
    canvas = document.getElementById( "myCanvas" );
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.8, 0.8, 0.8, 1.0 );
    gl.clear( gl.COLOR_BUFFER_BIT );
    render();
   
    canvas.addEventListener("mousedown", function(event){
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
            }
        }

        gl.bindBuffer( gl.ARRAY_BUFFER, vertexBufferId );
        gl.bufferSubData(gl.ARRAY_BUFFER, 8*numIndices, flatten(t));

        t = vec4(vec4( 0.0, 0.0, 0.0, 1.0 ));

        gl.bindBuffer( gl.ARRAY_BUFFER, cBufferId );
        gl.bufferSubData(gl.ARRAY_BUFFER, 16*numIndices, flatten(t));

        numIndices++;
    } );

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

    let cBufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBufferId );
    gl.bufferData( gl.ARRAY_BUFFER, 16*maxNumVertices, gl.STATIC_DRAW );
    let vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );
}

function render() {

    if(numIndices < 2){
        window.requestAnimationFrame(render);
        return;
    }
    gl.clear( gl.COLOR_BUFFER_BIT );
    gl.drawArrays( gl.LINE_STRIP, 0, numIndices );
    window.requestAnimationFrame(render);
}
