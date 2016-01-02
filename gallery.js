var WALLHEIGHT = 100;
var WALLWIDTH = 10;
var PILLARHEIGHT = 110;
var PICTUREOFFSETMIN = 30;
var PICTUREOFFSETMAX = 150;

var WIDTH, HEIGHT;
var stats, info, svgContainer, exportLink;
var scene, topCamera, fxCamera, renderer, wallMaterial, groundMaterial;
var time;
var ground;
var ambientLight;
var probeMesh;
var basicMaterial;
var renderingEnabled;
var ui = {};

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
	CameraPlacement    : "CameraPlacement"
} );

var state = GameState.Unknown;
var topViewZoom = 6.0;

var polygon = new Array();
var polygonMeshes;

var dcel = null;

var cameraIndex = 0;

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

	svgContainer = document.createElement( "div" );
	svgContainer.id = "svg-container";

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

	renderer.domElement.addEventListener( 'mousedown', onMouseDown, false );

	var light = new THREE.PointLight( 0xaaaaaa );
	light.position.set( 0, 0, 500 );
	scene.add( light );

//	var light = new THREE.SpotLight( 0xffffff, 2.0 );
//	light.position.set( 0, 700, 300 );
//	light.lookAt( scene.position );
//	scene.add( light );

	ambientLight = new THREE.AmbientLight( 0x000033 );
	scene.add( ambientLight );

	wallMaterial =
		new THREE.MeshPhongMaterial( {
			color: 0x333333,
			specular: 0xffffff,
			shininess: 5,
		} );

	groundMaterial = wallMaterial;

	ground = new THREE.Mesh(
		new THREE.PlaneGeometry( 3000, 3000 ),
		groundMaterial );

	polygonMeshes = new THREE.Object3D();
	scene.add( polygonMeshes );

	time = new THREE.Clock( true );

	probeMesh = new THREE.Mesh(
		new THREE.SphereGeometry( 10, 16, 16 ),
		new THREE.MeshBasicMaterial( { color: 0xff0000 } ) );
	probeMesh.visible = false;

	scene.add( probeMesh );
	
	basicMaterial = new THREE.MeshBasicMaterial(
		{ vertexColors: THREE.VertexColors } );
	basicMaterial.transparent = true;
	basicMaterial.opacity = 0.5;
	basicMaterial.needsUpdate = true;

	initUI();

	disableRendering();
}

function initUI()
{
	ui.titleText = new UI.Text( "GUARD THE GALLERY" )
		.position( { top: 100, left: 100 } ).cssClass( "title" ).show();

	ui.mainMenu = new UI.Group()
		.position( { top: 200, left: 100 } )
		.size( 125, 200 )
		.cssClass( "verticalMenu" );
	
	ui.mainMenu.add( new UI.Button( "Story Mode",
		function()
		{
			ui.mainMenu.hide();
			ui.storyMenu.show();
		} ).position( { top: 0, left: 0 } ).show() );

	ui.mainMenu.add( new UI.Button( "Versus Mode",
		function()
		{
		} ).position( { top: 40, left: 0 } ).show().disable() );

	ui.mainMenu.show();
	
	ui.mainMenu.add( new UI.Button( "Level Creation",
		function()
		{
			ui.mainMenu.hide();
			ui.titleText.hide();
			enableRendering();
			changeState( GameState.LevelCreation );
		} ).position( { top: 80, left: 0 } ).show() );

	ui.storyMenu = new UI.Group()
		.position( { top: 200, left: 100 } )
		.size( 125, 200 )
		.cssClass( "verticalMenu" );

	ui.storyMenu.add( new UI.Button( "Continue",
		function()
		{
			ui.storyMenu.hide();
			ui.titleText.hide();
			enableRendering();
			loadLevel( levels[ 0 ] );
		} ).position( { top: 0, left: 0 } ).show() );

	ui.storyMenu.add( new UI.Button( "Select Level",
		function()
		{
			ui.storyMenu.hide();
			ui.levelsMenu.show();
		} ).position( { top: 40, left: 0 } ).show() );
	ui.storyMenu.add( new UI.Button( "BACK",
		function()
		{
			ui.storyMenu.hide();
			ui.mainMenu.show();
		} ).position( { top: 120, left: 0 } ).show() );

	ui.levelsMenu = new UI.Group()
		.position( { top: 200, left: 100 } )
		.size( 125, 200 )
		.cssClass( "verticalMenu" );

	var levelOnclick =
		function( i )
		{
			ui.levelsMenu.hide();
			ui.titleText.hide();
			enableRendering();
			loadLevel( levels[ i ] );
		};
	for( var i = 0; i < levels.length; ++i )
	{
		ui.levelsMenu.add( new UI.Button( "Level " + ( i + 1 ),
			levelOnclick.bind( this, i ) )
				.position( { top: 40 * i, left: 0 } ).show() );
	}
	ui.levelsMenu.add( new UI.Button( "BACK",
		function()
		{
			ui.levelsMenu.hide();
			ui.storyMenu.show();
		} ).position( { top: levels.length * 40 + 40, left: 0 } ).show() );

	ui.levelCreationMenu = new UI.Group()
		.position( { top: 15, left: 15 } ).cssClass( "horizontalMenu" );

	ui.levelCreationMenu.cancelButton = new UI.Button( "BACK",
		function()
		{
			changeState( GameState.Unknown );
			disableRendering();
			ui.levelCreationMenu.hide();
			ui.mainMenu.show();
			ui.titleText.show();
		}, ui.levelCreationMenu ).position( { top: 0, left: 0 } ).show();

	ui.levelCreationMenu.finishButton = new UI.Button( "Finish",
		function()
		{
			changeState( GameState.LevelProcessing );
		}, ui.levelCreationMenu ).position( { top: 40, left: 135 } ).show();

	ui.levelCreationMenu.newButton = new UI.Button( "New",
		function()
		{
			//restart();
			changeState( GameState.Unknown );
			changeState( GameState.LevelCreation );
		}, ui.levelCreationMenu ).position( { top: 0, left: 135 } ).show();

	ui.levelCreationMenu.undoButton = new UI.Button( "Undo",
		function()
		{
			undoWall();
		}, ui.levelCreationMenu ).position( { top: 40, left: 0 } ).show();

	ui.levelCreationMenu.add( new UI.Text( "Import SVG:" )
		.size( 150, 20 ).position( { top: 10, left: 300 } ).show() );
	ui.levelCreationMenu.filePicker =
		new UI.FilePicker( ".svg", onSvgSelected, ui.levelCreationMenu )
			.position( { top: 35, left: 300 } ).show();

	ui.levelCreationMenu.exportLink =
		new UI.Link( "[JS Level File]", null, ui.levelCreationMenu )
			.size( 130, 20 ).position( { top: 40, left: 0 } );

	ui.ingameMenu = new UI.Group()
		.position( { top: 15, left: 15 } ).cssClass( "horizontalMenu" );

	ui.ingameMenu.quitButton = new UI.Button( "QUIT",
		function()
		{
			changeState( GameState.Unknown );
			disableRendering();
			ui.ingameMenu.hide();
			ui.storyMenu.show();
			ui.titleText.show();
		}, ui.ingameMenu ).position( { top: 0, left: 0 } ).show();
}

function animate()
{
	if( renderingEnabled )
	{
		//stats.begin();

		setView( fxView );
		renderer.render( scene, fxView.camera );

		setView( topView );
		renderer.render( scene, topView.camera );

		//stats.end();
	}

	requestAnimationFrame( animate );
}

function disableRendering()
{
	renderer.domElement.style.visibility = "hidden";
	renderingEnabled = false;
}

function enableRendering()
{
	renderer.domElement.style.visibility = "visible";
	renderingEnabled = true;
}

function restart()
{
	polygon.length = 0;
	scene.remove( polygonMeshes );
	polygonMeshes = new THREE.Object3D();
	scene.add( polygonMeshes );

	probeMesh.visible = false;

	console.clear();
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

function onSvgSelected( event )
{
	var input = event.target;

	var reader = new FileReader();
	reader.onload = function()
	{
		importLevel( importSvg, reader.result );
	};
	reader.readAsText( input.files[ 0 ] );
}

function loadLevel( level )
{
	function toVectorArray( level )
	{
		var res = new Array( level.length );
		for( var i = 0; i < level.length; ++i )
		{
			res[ i ] = new THREE.Vector2( level[ i ][ 0 ], level[ i ][ 1 ] );
		}
		return res;
	}

	importLevel( toVectorArray, level );

	changeState( GameState.CameraPlacement );
}

function importLevel( internal, data )
{
	restart();
	changeState( GameState.Unknown );

	var points = internal( data );

	if( points != null )
	{
		polygon = points;

		normalizePolygon( Math.min( WIDTH, HEIGHT ) );
		createPolygonMeshes();

		changeState( GameState.LevelProcessing );
	}
	else
	{
		alert( "Importing level geometry failed!" );
	}
}

function importSvg( svg )
{
	svgContainer.innerHTML = svg;

	// TODO: find right path if more than one are present
	var pathElems = svgContainer.getElementsByTagName( "path" );
	if( pathElems.length <= 0 )
	{
		return null;
	}
	var segments = pathElems[ 0 ].pathSegList;
	var length = pathElems[ 0 ].pathSegList.numberOfItems;
	if( length <= 0 )
	{
		return null;
	}

	var points = new Array();
	var seg = segments.getItem( 0 );
	if( seg.pathSegType == SVGPathSeg.PATHSEG_MOVETO_ABS ||
	    seg.pathSegType == SVGPathSeg.PATHSEG_MOVETO_REL )
	{
		points.push( new THREE.Vector2( seg.x, seg.y ) );
//		console.log( "Imported point: ( " + seg.x + ", " + seg.y + " )" );
	}
	else
	{
		return null;
	}

	for( var i = 1; i < length; ++i )
	{
		var seg = segments.getItem( i );
		switch( seg.pathSegType )
		{
			case SVGPathSeg.PATHSEG_LINETO_ABS:
			case SVGPathSeg.PATHSEG_CURVETO_CUBIC_ABS:
				points.push( new THREE.Vector2( seg.x, seg.y ) );
//				console.log( "Imported point: ( " + seg.x + ", " + seg.y + " )" );
				break;
			case SVGPathSeg.PATHSEG_LINETO_REL:
			case SVGPathSeg.PATHSEG_CURVETO_CUBIC_REL:
				points.push(
					new THREE.Vector2( seg.x, seg.y )
					.add( points[ points.length - 1 ] ) );
//				console.log( "Imported point: +( " + seg.x + ", " + seg.y + " ) = ( " + points[ points.length - 1 ].x + ", " + points[ points.length - 1 ].y + " )" );
				break;
			case SVGPathSeg.PATHSEG_CLOSEPATH:
				if( i < length - 1 )
				{
					return null;
				}
				break;
			default:
				return null;
		}
	}

	return points;
}

function normalizePolygon( size )
{
	if( polygon.length <= 0 )
	{
		return;
	}

	var xmin = polygon[ 0 ].x;
	var xmax = xmin;
	var ymin = polygon[ 0 ].y;
	var ymax = ymin;
	for( var i = 1; i < polygon.length; ++i )
	{
		var p = polygon[ i ];
		if( p.x < xmin )
		{
			xmin = p.x;
		}
		else if( p.x > xmax )
		{
			xmax = p.x;
		}
		if( p.y < ymin )
		{
			ymin = p.y;
		}
		else if( p.y > ymax )
		{
			ymax = p.y;
		}
	}

	var scale = Math.min( size / ( xmax - xmin ), size / ( ymax - ymin ) );
	var center =
		new THREE.Vector2( 0.5 * ( xmax + xmin ), 0.5 * ( ymax + ymin ) );

	for( var i = 0; i < polygon.length; ++i )
	{
		polygon[ i ].sub( center ).multiplyScalar( scale );
	}
}

function createPolygonMeshes()
{
	if( polygon.length <= 0 )
	{
		return;
	}

	polygonMeshes.add( createPillar( polygon[ 0 ] ) );

	for( var i = 1; i < polygon.length; ++i )
	{
		polygonMeshes.add( createPillar( polygon[ i ] ) );
		polygonMeshes.add( createWall( polygon[ i - 1 ], polygon[ i ] ) );
	}

	if( polygon.length > 2 )
	{
		polygonMeshes.add(
			createWall( polygon[ polygon.length - 1 ], polygon[ 0 ] ) );
	}
}

function createExportLink()
{
	if( polygon.length <= 0 )
	{
		return null;
	}

	var txt = "levels.push( [\n";
	for( var i = 0; i < polygon.length; ++i )
	{
		txt += "[ " + polygon[ i ].x + ", " + polygon[ i ].y;
		txt += ( i < polygon.length - 1 ? " ],\n" : " ]\n" );
	}
	txt += "] );\n";

	var blob = new Blob( [ txt ], { type: "application/javascript" } );
	return URL.createObjectURL( blob );
}

function createWall( start, end )
{
	var diff = end.clone().sub( start );
	var center = new THREE.Vector3().lerpVectors( start, end, 0.5 );
	var length = diff.length();

	var wall = new THREE.Mesh(
		new THREE.BoxGeometry( length, WALLWIDTH, WALLHEIGHT ),
		wallMaterial );
	wall.rotation.set( 0, 0, Math.atan2( diff.y, diff.x ) );
	wall.position.set( center.x, center.y, WALLHEIGHT / 2 );

	return wall;
}

function createPillar( pos )
{
	var pillar = new THREE.Mesh(
		new THREE.CylinderGeometry( 10, 10, PILLARHEIGHT, 16, 1 ),
		wallMaterial );
	pillar.rotation.set( Math.PI / 2, 0, 0 );
	pillar.position.set( pos.x, pos.y, PILLARHEIGHT / 2 );

	return pillar;
}

function screenToWorldPosition( coord )
{
	var p = projectPointToViewport( topView.viewport, coord );
	if( p !== null )
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
		if( p !== null )
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
			return null;
		}
	}

	return p;
}

function onMouseDown( event )
{
	event.preventDefault();
	var coord = new THREE.Vector2( event.clientX, HEIGHT - event.clientY );
	var p = screenToWorldPosition( coord );
	if( p === null )
	{
		return;
	}

	if( state === GameState.LevelCreation )
	{
		polygon.push( p );

		if( polygon.length > 1 )
		{
			polygonMeshes.add(
				createWall( polygon[ polygon.length - 2 ], p ) );
		}

		polygonMeshes.add( createPillar( p ) );
	}
	else if( state === GameState.CameraPlacement )
	{
		probeMesh.position.set( p.x, p.y, 0 );
		if( !probeMesh.visible )
		{
			probeMesh.visible = true;
		}

		if( dcel.faces[ 0 ].contains( p ) )
		{
			probeMesh.material.color.setHex( 0x00ff00 );

			var polyPoints = new Array();
			var iter = dcel.edges[ 0 ];
			do
			{
				polyPoints.push( [ iter.origin.pos.x, iter.origin.pos.y ] );
				iter = iter.next;
			} while( iter !== dcel.edges[ 0 ] );

			var segments =
				VisibilityPolygon.convertToSegments( [ polyPoints ] );

			var position = [ p.x, p.y ];

			var visibilityPoints =
				VisibilityPolygon.compute( position, segments );

			for( var i = 0; i < visibilityPoints.length; ++i )
			{
				visibilityPoints[ i ] = new THREE.Vector2(
					visibilityPoints[ i ][ 0 ],
					visibilityPoints[ i ][ 1 ] );
			}

			var visPolyDCEL = new DCEL().fromVectorList( visibilityPoints );
			var visPolyTri = triangulateSimplePolygon( visPolyDCEL );

			var color = Math.floor( 0xffffff * Math.random() );
			var visPolyMesh = createTriangulationMesh(
				visPolyTri, basicMaterial, color );
			visPolyMesh.position.set(
				0, 0, ( ++cameraIndex ) * WALLHEIGHT / 100.0 );

			polygonMeshes.add( visPolyMesh );

			var cameraMesh = createCameraMesh( p, color );
			polygonMeshes.add( cameraMesh );
		}
		else
		{
			probeMesh.material.color.setHex( 0xff0000 );
		}
	}
}

function createCameraMesh( pos, _color )
{
	var mesh = new THREE.Mesh(
		new THREE.SphereGeometry( 12, 16, 16 ),
		new THREE.MeshBasicMaterial( { color: _color } ) );
	mesh.position.set( pos.x, pos.y, 0 );

	return mesh;
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
	else if( s == GameState.LevelCreation )
	{
		ui.levelCreationMenu.undoButton.show();
		ui.levelCreationMenu.finishButton.show();
		ui.levelCreationMenu.exportLink.hide();
		ui.levelCreationMenu.filePicker.elem.value = null;
		ui.levelCreationMenu.show();
	}
	else if( s == GameState.LevelProcessing )
	{
		if( polygon.length > 2 )
		{
			ui.levelCreationMenu.finishButton.hide();
			ui.levelCreationMenu.undoButton.hide();

			var link = createExportLink();
			ui.levelCreationMenu.exportLink.url( link ).show();

			processLevel();
		}
		else
		{
			return;
		}
	}
	else if( s == GameState.CameraPlacement )
	{
		ui.ingameMenu.show();
	}

	state = s;
}

function processLevel()
{
	polygonMeshes.add(
		createWall( polygon[ polygon.length - 1 ], polygon[ 0 ] ) );

	dcel = new DCEL().fromVectorList( polygon );

	placePictures();

	var triDCEL = triangulateSimplePolygon( dcel );
	
	var groundMesh = createTriangulationMesh( triDCEL, groundMaterial );
	polygonMeshes.add( groundMesh );
}

function visualizeDCEL( face, color, obj )
{
	function visualizeEdge( e )
	{
		var orig2 =
			e.normal().multiplyScalar( 3 ).add( e.origin.pos );
		var dir2 = e.vector();
		var len = dir2.length();
		dir2.divideScalar( len );

		var headLen = Math.min( len / 4, 75 );

		var arrow = new THREE.ArrowHelper(
			new THREE.Vector3( dir2.x, dir2.y, 0 ),
			new THREE.Vector3( orig2.x, orig2.y, 120 ),
			len,
			color,
			headLen,
			headLen / 3 );
		obj.add( arrow );
	}

	face.temp = true;

	var iter = face.edge;
	do
	{
		if( iter.twin !== null && iter.twin.face.temp === null )
		{
			visualizeDCEL( iter.twin.face, color, obj );
		}

		visualizeEdge( iter );

		iter = iter.next;
	} while( iter !== face.edge );
}

function placePictures()
{
	function randOffset()
	{
		var r = Math.random();
		return ( r * PICTUREOFFSETMIN + ( 1 - r ) * PICTUREOFFSETMAX ); 
	}

	var texture = new THREE.TextureLoader().load( "apple.jpg" );
	var material = new THREE.MeshPhongMaterial( { map: texture } );

	var iter = dcel.edges[ 0 ];
	do
	{
		var wallLength = iter.length();
		var pos = randOffset();
		var size = Math.min( ( Math.random() * 0.2 + 0.6 ) * WALLHEIGHT, 50 );

		while( wallLength >= pos + size + PICTUREOFFSETMIN )
		{
			pos += 0.5 * size;

			var height = 0.5 * WALLHEIGHT;
			var normal = iter.normal().multiplyScalar( WALLWIDTH * 0.53 );
			var dir = iter.direction();
			var vecPos = iter.lerp( pos / wallLength ).add( normal );

			var picture = new THREE.Mesh(
				new THREE.PlaneGeometry( size, size ),
				material );

			picture.position.set( vecPos.x, vecPos.y, height );
			picture.lookAt( new THREE.Vector3( normal.x, normal.y, 0 )
			                .add( picture.position ) );

			polygonMeshes.add( picture );

			pos += 0.5 * size + randOffset();
			size = Math.min( ( Math.random() * 0.5 + 0.3 ) * WALLHEIGHT, 50 );
		}

		iter = iter.next;
	} while( iter != dcel.edges[ 0 ] );
}

function createTriangulationMesh( dcel, material, color )
{
	var geom = new THREE.Geometry();
	for( var i = 0; i < dcel.vertices.length; ++i )
	{
		dcel.vertices[ i ].temp = i;

		geom.vertices.push( new THREE.Vector3( dcel.vertices[ i ].pos.x,
		                                       dcel.vertices[ i ].pos.y ) );
	}

	var normal = new THREE.Vector3( 0, 0, 1 );

	for( var i = 0; i < dcel.faces.length; ++i )
	{
		var e = dcel.faces[ i ].edge;
		if( color )
		{
			geom.faces.push( new THREE.Face3(
				e.origin.temp,
				e.next.origin.temp,
				e.next.next.origin.temp,
				normal,
				new THREE.Color( color ) ) );
		}
		else
		{
			geom.faces.push( new THREE.Face3(
				e.origin.temp,
				e.next.origin.temp,
				e.next.next.origin.temp,
				normal ) );
		}
	}

	return new THREE.Mesh( geom, material );
}
