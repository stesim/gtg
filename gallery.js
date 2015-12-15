var WIDTH, HEIGHT;
var stats, info;
var scene, topCamera, fxCamera, renderer, wallMaterial, groundMaterial;
var time;
var ground;
var ambientLight;

var topView = {
	background: new THREE.Color().setRGB( 0.5, 0.5, 0.5 ),
	camera: new THREE.OrthographicCamera( -100, 100, 100, -100, 0.1, 20000 ),
	update: function()
	{
		this.camera.left   = -this.viewport.width  / 2 * topViewZoom;
		this.camera.right  =  this.viewport.width  / 2 * topViewZoom;
		this.camera.top    =  this.viewport.height / 2 * topViewZoom;
		this.camera.bottom = -this.viewport.height / 2 * topViewZoom;

		this.camera.updateProjectionMatrix();
	},
	viewport:
	{
		x: 50,
		y: 50,
		width: 200,
		height: 200,
		absolute: true
	}
};

var fxView = {
	background: new THREE.Color().setRGB( 0.1, 0.1, 0.1 ),
	camera: new THREE.PerspectiveCamera( 90, 200 / 200, 0.1, 20000 ),
	update: function()
	{
		this.camera.aspect =
			( this.viewport.width * WIDTH ) / ( this.viewport.height * HEIGHT );
		this.camera.updateProjectionMatrix();
	},
	viewport:
	{
		x: 0.0,
		y: 0.0,
		width: 1.0,
		height: 1.0,
		absolute: false
	}
};

var GameState = Object.freeze( {
	Unknown            : "Unknown",
	LevelCreation      : "LevelCreation",
	LevelProcessing    : "LevelProcessing",
} );

var GameStateInfo = {};
GameStateInfo[ GameState.Unknown ] =
	"Press 'c' to enter level creation mode. Press 'q' at any moment to return to this screen.";
GameStateInfo[ GameState.LevelCreation ] =
	"Add gallery walls using left click; undo walls using 'z'. Press 'f' to close the gallery walls and finish level creation. Press 'q' to cancel level creation.";
GameStateInfo[ GameState.LevelProcessing ] =
	"TODO / DEBUG: DCEL visualization";

var state = GameState.Unknown;
var topViewZoom = 6.0;

var polygon = new Array();
var polygonMeshes;

var dcel = null;

init();
animate();

function init()
{
//	stats = new Stats();
//	stats.setMode( 0 );
//
//	stats.domElement.style.position = 'absolute';
//	stats.domElement.style.left = '10px';
//	stats.domElement.style.bottom = '10px';
//	document.body.appendChild( stats.domElement );

	info = document.createElement( 'div' );
	info.style.position = 'absolute';
	info.style.padding = '10px';
	info.style.width = '100%';
	info.style.textAlign = 'center';
	info.style.color = '#ffffff';
	setInfo( GameStateInfo[ state ] );

	document.body.appendChild( info );

	scene = new THREE.Scene();
	WIDTH = window.innerWidth;
	HEIGHT = window.innerHeight;

	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.enableScissorTest( true );
	renderer.setSize( WIDTH, HEIGHT );
	document.body.appendChild( renderer.domElement );

	topViewZoom = Math.max(
		WIDTH / topView.viewport.width,
		HEIGHT / topView.viewport.height ) + 1;

	fxView.camera.position.set( 0, 0, 700 );
	fxView.camera.lookAt( scene.position );
	fxView.camera.up.set( 0, 0, 1 );
	fxView.update();
	scene.add( fxView.camera );

	topView.camera.position.set( 0, 0, 500 );
	topView.camera.up.set( 0, 1, 0 );
	topView.camera.lookAt( scene.position );
	topView.update();
	scene.add( topView.camera );

	window.addEventListener( 'resize', function() {
		WIDTH = window.innerWidth;
		HEIGHT = window.innerHeight;
		renderer.setSize( WIDTH, HEIGHT );

		topViewZoom = Math.max(
			WIDTH / topView.viewport.width,
			HEIGHT / topView.viewport.height ) + 1;

		fxView.update();
		topView.update();
	} );

	document.addEventListener( 'mousedown', onMouseDown, false );
	document.addEventListener( 'keydown', onKeyDown, false );

	var light = new THREE.PointLight( 0xaaaaaa );
	light.position.set( 0, 0, 500 );
	scene.add( light );

//	var light = new THREE.SpotLight( 0xffffff, 2.0 );
//	light.position.set( 0, 700, 300 );
//	light.lookAt( scene.position );
//	scene.add( light );

	ambientLight = new THREE.AmbientLight( 0x000033 );
	scene.add( ambientLight );

//	wallMaterial =
//		new THREE.MeshLambertMaterial( {
//			color: 0xffffff
//		} );
	wallMaterial =
		new THREE.MeshPhongMaterial( {
			color: 0xaaaaaa,
			specular: 0xffffff,
			shininess: 50,
		} );

	groundMaterial = shaders.floor1;
	groundMaterial.uniforms.fLines.value = 64.0;

	ground = new THREE.Mesh(
		new THREE.PlaneGeometry( 3000, 3000 ),
		groundMaterial );
//	scene.add( ground );

//	var axis = new THREE.Mesh(
//		new THREE.BoxGeometry( 512, 16, 16 ),
//		wallMaterial );
//	axis.position.set( 256, 0, 0 );
//	scene.add( axis );
//	axis = new THREE.Mesh(
//		new THREE.BoxGeometry( 16, 512, 16 ),
//		wallMaterial );
//	axis.position.set( 0, 256, 0 );
//	scene.add( axis );

	polygonMeshes = new THREE.Object3D();
	scene.add( polygonMeshes );

	time = new THREE.Clock( true );
}

function animate()
{
	//stats.begin();

	setView( fxView );

	ground.visible = true;
	groundMaterial.uniforms.fIntensity.value =
		0.5 * Math.pow( Math.sin( time.getElapsedTime() + Math.PI ), 2 ) + 0.10;
	groundMaterial.uniforms.vecRandomParam.value =
		new THREE.Vector2( time.getElapsedTime(), time.getDelta() );
	renderer.render( scene, fxView.camera );

	setView( topView );

	ground.visible = false;
	renderer.render( scene, topView.camera );

	requestAnimationFrame( animate );

	//stats.end();
}

function restart()
{
	polygon.length = 0;
	scene.remove( polygonMeshes );
	polygonMeshes = new THREE.Object3D();
	scene.add( polygonMeshes );
}

function setView( view )
{
	var x = view.viewport.x;
	var y = view.viewport.y;
	var width = view.viewport.width;
	var height = view.viewport.height;
	if( !view.viewport.absolute )
	{
		x *= WIDTH;
		y *= HEIGHT;
		width *= WIDTH;
		height *= HEIGHT;
	}

	renderer.setViewport( x, y, width, height );
	renderer.setScissor( x, y, width, height );
	renderer.setClearColor( view.background );
}

function projectPointToViewport( viewport, coord )
{
	var p = coord.clone();
	if( viewport.absolute )
	{
		p.sub( new THREE.Vector2( viewport.x, viewport.y ) )
		 .divide( new THREE.Vector2( viewport.width, viewport.height ) );
	}
	else
	{
		p.divide( new THREE.Vector2( viewport.width * WIDTH,
		                             viewport.height * HEIGHT ) )
		 .sub( new THREE.Vector2( viewport.x, viewport.y ) );
	}

	if( p.x >= 0.0 && p.x <= 1.0 && p.y >= 0.0 && p.y <= 1.0 )
	{
		return p.clamp(
			new THREE.Vector2( 0.0, 0.0 ),
			new THREE.Vector2( 1.0, 1.0 ) );
	}
	else
	{
		return null;
	}
}

function createWall( start, end )
{
	var WALLHEIGHT = 100;

	var diff = end.clone().sub( start );
	var center = new THREE.Vector3().lerpVectors( start, end, 0.5 );
	var length = diff.length();

	var wall = new THREE.Mesh(
		new THREE.BoxGeometry( length, 10, WALLHEIGHT ),
		wallMaterial );
	wall.rotation.set( 0, 0, Math.atan2( diff.y, diff.x ) );
	wall.position.set( center.x, center.y, WALLHEIGHT / 2 );

	return wall;
}

function createPillar( pos )
{
	var PILLARHEIGHT = 110;

	var pillar = new THREE.Mesh(
		new THREE.CylinderGeometry( 10, 10, PILLARHEIGHT, 16, 1 ),
		wallMaterial );
	pillar.rotation.set( Math.PI / 2, 0, 0 );
	pillar.position.set( pos.x, pos.y, PILLARHEIGHT / 2 );

	return pillar;
}

function onMouseDown( event )
{
	event.preventDefault();
	var coord = new THREE.Vector2( event.clientX, HEIGHT - event.clientY );

	if( state == GameState.LevelCreation )
	{
		var p = projectPointToViewport( topView.viewport, coord );
		if( p != null )
		{
			p.addScalar( -0.5 )
			 .multiply( new THREE.Vector2( topView.viewport.width,
										   topView.viewport.height ) )
			 .multiplyScalar( topViewZoom );
			//alert( p.x + ", " + p.y );
		}
		else
		{
			p = projectPointToViewport( fxView.viewport, coord );
			if( p != null )
			{
				var p3 = new THREE.Vector3( 2 * p.x - 1, 2 * p.y - 1, 0.0 );
				p3.unproject( fxView.camera );
				var n = p3.clone().sub( fxView.camera.position ).normalize();
				p3.addScaledVector( n, -p3.z / n.z );
				//console.log( p3.x + ", " + p3.y + ", " + p3.z );
				p.set( p3.x, p3.y );
			}
			else
			{
				return;
			}
		}

		polygon.push( p );

		if( polygon.length > 1 )
		{
			polygonMeshes.add(
				createWall( polygon[ polygon.length - 2 ], p ) );
		}

		polygonMeshes.add( createPillar( p ) );
	}
}

function undoWall()
{
	if( state != GameState.LevelCreation )
	{
		return;
	}

	if( polygon.length > 1 )
	{
		polygon.length -= 1;
		polygonMeshes.remove(
			polygonMeshes.children[ polygonMeshes.children.length - 1 ] );
		polygonMeshes.remove(
			polygonMeshes.children[ polygonMeshes.children.length - 1 ] );
	}
	else if( polygon.length == 1 )
	{
		polygon.length -= 1;
		polygonMeshes.remove(
			polygonMeshes.children[ polygonMeshes.children.length - 1 ] );
	}
}

function onKeyDown( event )
{
	event = event || window.event;

	switch( String.fromCharCode( event.keyCode ) )
	{
		case 'C':
			changeState( GameState.LevelCreation );
			break;
		case 'F':
			changeState( GameState.LevelProcessing );
			break;
		case 'Z':
			undoWall();
			break;
		case 'Q':
			changeState( GameState.Unknown );
			break;
	}
}

function setInfo( str )
{
	info.innerHTML = str;
}

function changeState( s )
{
	if( s == state )
	{
		return;
	}
	else if( s == GameState.Unknown )
	{
		restart();
	}
	else
	{
		switch( state )
		{
			case GameState.Unknown:
				if( s != GameState.LevelCreation )
				{
					return;
				}
				break;
			case GameState.LevelCreation:
				if( s == GameState.LevelProcessing && polygon.length >= 2 )
				{
					processLevel();
				}
				else
				{
					return;
				}
				break;
			case GameState.LevelProcessing:
				return; //TODO
				break;
		}
	}

	state = s;
	setInfo( GameStateInfo[ state ] );
}

function processLevel()
{
	polygonMeshes.add(
		createWall( polygon[ polygon.length - 1 ], polygon[ 0 ] ) );

	dcel = simplePolygonFromVectorList( polygon );

	if( dcel == null )
	{
		alert( "Error: Failed to create DCEL structure." );
	}

	// TODO: remove
	var iter = dcel;
	do
	{
		var orig = new THREE.Vector3(
			iter.prev.origin.pos.x,
			iter.prev.origin.pos.y,
			120 );
		var dir2 = iter.origin.pos.clone().sub( iter.prev.origin.pos );
		var len = dir2.length();
		dir2.divideScalar( len );

		var headLen = Math.min( len / 4, 75 );

		var arrow = new THREE.ArrowHelper(
			new THREE.Vector3( dir2.x, dir2.y, 0 ),
			orig,
			len,
			0xffffff,
			headLen,
			headLen / 3 );
		polygonMeshes.add( arrow );

		iter = iter.next;
	} while( iter != dcel );
}
