var WALLHEIGHT = 100;
var WALLWIDTH = 10;
var PILLARHEIGHT = 103;
var PICTUREOFFSETMIN = 30;
var PICTUREOFFSETMAX = 150;

var ZAXIS = new THREE.Vector3( 0, 0, 1 );

var stats, svgContainer;
var time;
var probeMesh;
var dragging =
{
	active: false,
	start: null,
	last: null,
	//delta: null,
};
var keymap = {};

var currentLevel = 0;
var cameraIndex = 0;
var polygon = new Array();
var dcel = null;

var guards = new Array();
var pictures = new Array();

var isInFirstPerson = false;
var firstPersonGuard = null;
var lastFxCamRotation = 0.0;
var lastOverviewCamRotation = 0.0;
var lastOverviewCamPosition = new THREE.Vector3( 0, 0, 700 );
var moveOverviewByDrag = true;
var pickedGuard = null;

function Guard()
{
	this.position = null;
	this.polygon = null;
	this.cameraMesh = null;
	this.visibilityMesh = null;
	this.color = null;
}

function Picture( start, end, mesh )
{
	this.start = start;
	this.end = end;
	this.visibleFrom = null;
	this.mesh = mesh;
}

init();

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

	time = new THREE.Clock( true );

	graphics.init( update );

	probeMesh = new THREE.Mesh(
		new THREE.SphereGeometry( 10, 16, 16 ),
		new THREE.MeshBasicMaterial( { color: 0xff0000 } ) );
	probeMesh.visible = false;

	//graphics.scene.add( probeMesh );

	graphics.renderer.domElement.
		addEventListener( "mousedown", onMouseDown, false );
	graphics.renderer.domElement.
		addEventListener( "mouseup", onMouseUp, false );

	document.addEventListener( "keydown", onKeyDown, false );
	document.addEventListener( "keyup", onKeyUp, false );

	ui.init();

	GameState.set( GameStates.Menu );

	graphics.render();
}

function onKeyDown( event )
{
	event = event || window.event;
	var key = String.fromCharCode( event.keyCode );

	keymap[ key ] = true;
}

function onKeyUp( event )
{
	event = event || window.event;
	var key = String.fromCharCode( event.keyCode );

	keymap[ key ] = false;
}

function isKeyDown( key )
{
	return keymap[ key ];
}

function update()
{
	function handleCameraWallCollision( prevPosition )
	{
		var newPosition = new THREE.Vector2(
			graphics.fxView.camera.position.x,
			graphics.fxView.camera.position.y );
		var delta = newPosition.clone().sub( prevPosition );

		var closestIntersection = null;
		var intersectedEdge = null;

		for( var i = 0; i < dcel.edges.length; ++i )
		{
			var edge = dcel.edges[ i ];
			if( delta.dot( edge.normal() ) < 0.0 )
			{
				var intersection = extendedLineIntersection(
					prevPosition, newPosition,
					edge.origin.pos, edge.next.origin.pos );

				if( intersection !== null &&
					intersection[ 1 ] >= 0.0 && intersection[ 1 ] <= 1.0 &&
					intersection[ 2 ] >= 0.0 && intersection[ 2 ] <= 1.0 &&
					( closestIntersection === null ||
					  intersection[ 1 ] < closestIntersection[ 1 ] ) )
				{
					closestIntersection = intersection;
					intersectedEdge = edge;
				}
			}
		}

		if( closestIntersection !== null )
		{
			var deltaOutside =
				newPosition.clone().sub( closestIntersection[ 0 ] );
			var edgeVec = intersectedEdge.vector();
			var outsideProj = deltaOutside.dot( edgeVec ) / edgeVec.lengthSq();
			var finalLocalPos = closestIntersection[ 2 ] + outsideProj;

			finalLocalPos = Math.min( Math.max( finalLocalPos, 0.0 ), 1.0 );

			var finalPos = intersectedEdge.lerp( finalLocalPos );

			graphics.fxView.camera.position.x = finalPos.x;
			graphics.fxView.camera.position.y = finalPos.y;

//			graphics.fxView.camera.position.x = closestIntersection[ 0 ].x;
//			graphics.fxView.camera.position.y = closestIntersection[ 0 ].y;
		}
	}

	var translateDistance = ( time.getDelta() * 100.0 );
	if( isInFirstPerson )
	{
		var cameraMoved = false;
		var prevPosition = new THREE.Vector2(
			graphics.fxView.camera.position.x,
			graphics.fxView.camera.position.y );
		if( isKeyDown( 'W' ) && !isKeyDown( 'S' ) )
		{
			graphics.fxView.camera.translateZ( -translateDistance );
			cameraMoved = true;
		}
		else if( isKeyDown( 'S' ) )
		{
			graphics.fxView.camera.translateZ( translateDistance );
			cameraMoved = true;
		}

		if( isKeyDown( 'A' ) && !isKeyDown( 'D' ) )
		{
			graphics.fxView.camera.translateX( -translateDistance );
			cameraMoved = true;
		}
		else if( isKeyDown( 'D' ) )
		{
			graphics.fxView.camera.translateX( translateDistance );
			cameraMoved = true;
		}

		if( cameraMoved )
		{
			handleCameraWallCollision( prevPosition );
		}
	}
}

function resetFxCamera()
{
	graphics.fxView.camera.up.set( 0, 1, 0 );
	graphics.fxView.camera.position.copy( lastOverviewCamPosition );
	graphics.fxView.camera.rotation.set( 0, 0, 0 );
	//graphics.fxView.camera.lookAt( graphics.scene.position );
}

function restart()
{
	polygon.length = 0;
	graphics.clearLevelMeshes();

	resetFxCamera();
	lastFxCamRotation = 0;
	lastOverviewCamRotation = 0;
	lastOverviewCamPosition.set( 0, 0, 700 );

	ui.hint.cancel();

	probeMesh.visible = false;

	//console.clear();
}

function finishLevelEditing()
{
	GameStates.LevelEditing.finished = true;

	ui.levelCreationMenu.finishButton.hide();
	ui.levelCreationMenu.undoButton.hide();

	var link = createExportLink();
	ui.levelCreationMenu.exportLink.url( link ).show();
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

	finishLevelEditing();
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

	GameState.set( GameStates.LevelLoading );

	guards.length = 0;
	pictures.length = 0;
	cameraIndex = 0;

	importLevel( toVectorArray, levels[ level ] );

	currentLevel = level;

	GameState.set( GameStates.GuardPlacement );

	// TODO: implement hints in level description
	var hint = null;
	switch( level )
	{
		case 0:
			hint = "Place guards to guard the art by clicking inside the gallery.";
			break;
		case 2:
			hint = "If you cannot see some of the art, try moving the camera by holding the left mouse button and moving the mouse.";
			break;
		case 4:
			hint = "Sometimes one guard may not be enough to cover all the valuable art.";
			break;
		case 6:
			hint = "A guard you placed turned out to be less useful than expected? If the cursor is on a guard when pressing the mouse button, that guard will be moved instead of the camera. Moving guards to the outside of the gallery removes them.";
			break;
	}
	if( hint !== null )
	{
		ui.hint.display( hint, 10 );
	}
}

function importLevel( parser, data )
{
	restart();

	var points = parser( data );

	if( points != null )
	{
		polygon = points;

		normalizePolygon( Math.min( graphics.WIDTH, graphics.HEIGHT ) );
		createPolygonMeshes();

		processLevel();
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
		points.push( new THREE.Vector2( seg.x, -seg.y ) );
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
				points.push( new THREE.Vector2( seg.x, -seg.y ) );
				break;
			case SVGPathSeg.PATHSEG_LINETO_REL:
			case SVGPathSeg.PATHSEG_CURVETO_CUBIC_REL:
				points.push(
					new THREE.Vector2( seg.x, -seg.y )
					.add( points[ points.length - 1 ] ) );
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
		if( p.x < xmin )      { xmin = p.x; }
		else if( p.x > xmax ) { xmax = p.x; }

		if( p.y < ymin )      { ymin = p.y; }
		else if( p.y > ymax ) { ymax = p.y; }
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
	if( polygon.length <= 0 ) { return; }

	//graphics.levelMeshes.add( createPillar( polygon[ 0 ] ) );

	for( var i = 1; i < polygon.length; ++i )
	{
		//graphics.levelMeshes.add( createPillar( polygon[ i ] ) );
		graphics.levelMeshes.add( createWall( polygon[ i - 1 ], polygon[ i ] ) );
	}

	if( polygon.length > 2 )
	{
		graphics.levelMeshes.add(
			createWall( polygon[ polygon.length - 1 ], polygon[ 0 ] ) );
	}
}

function createExportLink()
{
	if( polygon.length <= 0 ) { return null; }

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
//		new THREE.BoxGeometry( length, WALLWIDTH, WALLHEIGHT ),
		new THREE.PlaneGeometry( length, WALLHEIGHT ),
		graphics.wallMaterial );
	wall.rotation.order = "ZXY";
	wall.rotation.set( Math.PI / 2, 0, Math.atan2( diff.y, diff.x ) );
	wall.position.set( center.x, center.y, WALLHEIGHT / 2 );

	return wall;
}

function createPillar( pos )
{
	var pillar = new THREE.Mesh(
		new THREE.CylinderGeometry( WALLWIDTH / 2, WALLWIDTH / 2, PILLARHEIGHT, 16, 1 ),
		graphics.wallMaterial );
	pillar.rotation.set( Math.PI / 2, 0, 0 );
	pillar.position.set( pos.x, pos.y, PILLARHEIGHT / 2 );

	return pillar;
}

function addOrMoveGuard( guard, p )
{
	if( guard === null )
	{
		guard = new Guard();
		guards.push( guard );

		guard.color = Math.floor( 0xffffff * Math.random() );
		guard.guardMesh = createCameraMesh( p, guard.color );

		graphics.levelMeshes.add( guard.guardMesh );
	}
	else
	{
		removePictureVisibilityFrom( guard.polygon );

		graphics.levelMeshes.remove( guard.visibilityMesh );

		guard.guardMesh.position.set( p.x, p.y, 0 );
	}

	guard.position = p;

//	var polyPoints = new Array();
//	var iter = dcel.edges[ 0 ];
//	do
//	{
//		polyPoints.push( [ iter.origin.pos.x, iter.origin.pos.y ] );
//		iter = iter.next;
//	} while( iter !== dcel.edges[ 0 ] );
//
//	var segments =
//		VisibilityPolygon.convertToSegments( [ polyPoints ] );
//
//	var position = [ p.x, p.y ];
//
//	var visibilityPoints =
//		VisibilityPolygon.compute( position, segments );
//
//	for( var i = 0; i < visibilityPoints.length; ++i )
//	{
//		visibilityPoints[ i ] = new THREE.Vector2(
//			visibilityPoints[ i ][ 0 ],
//			visibilityPoints[ i ][ 1 ] );
//	}
//
//	guard.polygon = new DCEL().fromVectorList( visibilityPoints );

	guard.polygon = visibility( dcel, p );

	var visPolyTri = triangulateSimplePolygon( guard.polygon );

	guard.visibilityMesh = createTriangulationMesh(
		visPolyTri, graphics.visibilityMaterial, guard.color );
	guard.visibilityMesh.position.set( 0, 0, ( ++cameraIndex ) * 0.02 );

	graphics.levelMeshes.add( guard.visibilityMesh );

	addPictureVisibilityFrom( guard.polygon );
}

function removeGuard( guard )
{
	removePictureVisibilityFrom( guard.polygon );

	graphics.levelMeshes.remove( guard.guardMesh );
	graphics.levelMeshes.remove( guard.visibilityMesh );

	guards.splice( guards.indexOf( guard ), 1 );
}

function findGuardNear( p )
{
	for( var i = 0; i < guards.length; ++i )
	{
		if( p.distanceTo( guards[ i ].position ) < 15.0 )
		{
			return guards[ i ];
		}
	}
	return null;
}

function onMouseDown( event )
{
	if( GameState.get() === GameStates.GuardPlacement )
	{
		event.preventDefault();
		var coord = new THREE.Vector2( event.clientX,
									   graphics.HEIGHT - event.clientY );

		startDragging( coord );

		if( !isInFirstPerson )
		{
			var p = graphics.screenToWorldPosition( coord );
			if( p === null ) { return; }

			pickedGuard = findGuardNear( p );
		}
	}
}

function onMouseUp( event )
{
	event.preventDefault();
	var coord = new THREE.Vector2( event.clientX,
	                               graphics.HEIGHT - event.clientY );

	if( dragging.active )
	{
		if( isInFirstPerson )
		{
			lastFxCamRotation = graphics.fxView.camera.rotation.y;
		}
		else
		{
			if( moveOverviewByDrag )
			{
				lastOverviewCamPosition.copy( graphics.fxView.camera.position );
			}
			else
			{
				lastOverviewCamRotation -=
					( dragging.last.x - dragging.start.x ) / 250.0;
			}
		}

		stopDragging();
	}

	if( GameState.get() === GameStates.LevelEditing &&
		!GameStates.LevelEditing.finished )
	{
		var p = graphics.screenToWorldPosition( coord );
		if( p === null ) { return; }

		polygon.push( p );

		if( polygon.length > 1 )
		{
			graphics.levelMeshes.add(
				createWall( polygon[ polygon.length - 2 ], p ) );
		}
		else
		{
			graphics.levelMeshes.add( createPillar( p ) );
		}
	}
	else if( GameState.get() === GameStates.GuardPlacement )
	{
		if( !isInFirstPerson )
		{
			if( pickedGuard === null && !dragging.effective )
			{
				var p = graphics.screenToWorldPosition( coord );
				if( p === null ) { return; }

				if( dcel.faces[ 0 ].contains( p ) )
				{
					addOrMoveGuard( null, p );

					checkCompletion();
				}
			}
			else if( !dragging.effective )
			{
				switchToFirstPerson( pickedGuard );
			}
			else if( pickedGuard !== null )
			{
				var p = graphics.screenToWorldPosition( coord );
				if( p === null ) { return; }

				if( dcel.faces[ 0 ].contains( p ) )
				{
					addOrMoveGuard( pickedGuard, p );
					checkCompletion();
				}
				else
				{
					removeGuard( pickedGuard );
				}
			}
			pickedGuard = null;
		}
		else if( !dragging.effective )
		{
			var p = graphics.screenToWorldPosition( coord );
			if( p !== null && dcel.faces[ 0 ].contains( p ) )
			{
				graphics.fxView.camera.position.x = p.x;
				graphics.fxView.camera.position.y = p.y;
			}
		}
	}
}

function onMouseDrag( event )
{
	var coord = new THREE.Vector2( event.clientX,
	                               graphics.HEIGHT - event.clientY );

	//dragging.delta = coord.clone().sub( dragging.last );
	dragging.effective = true;
	dragging.last = coord;

	var diff = dragging.last.clone().sub( dragging.start );

	if( isInFirstPerson )
	{
		graphics.fxView.camera.rotation.y =
			( lastFxCamRotation - diff.x / 250.0 );
	}
	else if( pickedGuard === null )
	{
		if( moveOverviewByDrag )
		{
			graphics.fxView.camera.position.x =
				( lastOverviewCamPosition.x - diff.x );
			graphics.fxView.camera.position.y =
				( lastOverviewCamPosition.y - diff.y );
		}
		else
		{
			graphics.fxView.camera.position.set( 0, -200, 700 ).applyAxisAngle(
				ZAXIS, lastOverviewCamRotation - diff.x / 250.0 );
			graphics.fxView.camera.lookAt( graphics.scene.position );
		}

	}
}

function switchToFirstPerson( guard )
{
	isInFirstPerson = true;
	firstPersonGuard = guard;

	graphics.fxView.camera.position.set(
		guard.position.x,
		guard.position.y,
		WALLHEIGHT / 2 );
	graphics.fxView.camera.rotation.set( Math.PI / 2, lastFxCamRotation, 0 );
	graphics.fxView.camera.up.set( 0, 0, 1 );

	graphics.levelMeshes.remove( guard.guardMesh );
	guard.guardMesh.position.set( 0, 0, 0 );
	graphics.fxView.camera.add( guard.guardMesh );

	ui.ingameMenu.overviewButton.show();
}

function switchToOverview()
{
	ui.ingameMenu.overviewButton.hide();

	var guard = firstPersonGuard;

	graphics.fxView.camera.remove( guard.guardMesh );
	addOrMoveGuard( firstPersonGuard,
		new THREE.Vector2(
			graphics.fxView.camera.position.x,
			graphics.fxView.camera.position.y ) );
	graphics.levelMeshes.add( guard.guardMesh );

	resetFxCamera();

	isInFirstPerson = false;
	firstPersonGuard = null;
}

function startDragging( coord )
{
	//graphics.renderer.domElement.setCapture();
	graphics.renderer.domElement.
		addEventListener( "mousemove", onMouseDrag, false );

	dragging.active = true;
	dragging.effective = false;
	dragging.start = coord;
	dragging.last = dragging.start;
	//dragging.delta = new THREE.Vector2( 0, 0 );
}

function stopDragging()
{
	graphics.renderer.domElement.
		removeEventListener( "mousemove", onMouseDrag, false );
	dragging.active = false;
}

function isPictureOnEdge( picture, edge )
{
	var eps = 0.01;

	function isPointOnSegment( p, a, b )
	{
		var line = b.clone().sub( a );
		var proj = line.dot( p.clone().sub( a ) ) / line.lengthSq();

		return ( proj >= 0.0 - eps && proj <= 1.0 + eps );
	}

	var intersection = extendedLineIntersection(
		picture.start, picture.end, edge.origin.pos, edge.next.origin.pos );

	return ( intersection === null && Math.abs( edge.pointDistance( picture.start ) ) < eps &&
		( isPointOnSegment( picture.start, edge.origin.pos, edge.next.origin.pos ) ||
		  isPointOnSegment( picture.end,   edge.origin.pos, edge.next.origin.pos ) ||
		  isPointOnSegment( edge.origin.pos,      picture.start, picture.end ) ||
		  isPointOnSegment( edge.next.origin.pos, picture.start, picture.end ) ) );
}

function addPictureVisibilityFrom( polygon )
{
	for( var i = 0; i < pictures.length; ++i )
	{
		if( pictures[ i ].visibleFrom !== null ) { continue; }

		for( var j = 0; j < polygon.edges.length; ++j )
		{
			if( isPictureOnEdge( pictures[ i ], polygon.edges[ j ] ) )
			{
				pictures[ i ].visibleFrom = polygon;
				break;
			}
		}
	}
}

function removePictureVisibilityFrom( polygon )
{
	for( var i = 0; i < pictures.length; ++i )
	{
		if( pictures[ i ].visibleFrom === polygon )
		{
			pictures[ i ].visibleFrom = null;
		}
	}
}

function checkCompletion()
{
//	var unionArea = areaOfUnion( visibilityPolygons );
//
//	console.log( unionArea + " / " + dcel.faces[ 0 ].area() );
//
//	// TODO/HACK
//	//if( Math.abs( unionArea - dcel.faces[ 0 ].area() ) < 0.01 )
//	if( unionArea >= dcel.faces[ 0 ].area() - 0.01 )
//	{
//		GameState.set( GameStates.LevelCompleted );
//	}

	var completed = true;
	for( var i = 0; i < pictures.length; ++i )
	{
		if( pictures[ i ].visibleFrom === null )
		{
			completed = false;
			break;
		}
	}

	if( completed )
	{
		GameState.set( GameStates.LevelCompleted );
	}
}

function undoGuard()
{
	if( guards.length > 0 )
	{
		removeGuard( guards[ guards.length - 1 ] );
	}
}

function areaOfUnion( polygons )
{
	function areaOfUnionRec( polygons, indices, depth, maxDepth )
	{
		if( depth === maxDepth )
		{
			var tmp = "";
			var polys = new Array( maxDepth );
			for( var i = 0; i < polys.length; ++i )
			{
				polys[ i ] = polygons[ indices[ i ] ];
				tmp += indices[ i ] + ", ";
			}
			var ret = areaOfIntersection( polys );
			console.log( tmp + "-> " + ret );
			return ret;
		}
		else
		{
			var start = ( depth > 0 ? indices[ depth - 1 ] + 1 : 0 );
			var sum = 0;
			for( var i = start; i < polygons.length; ++i )
			{
				indices[ depth ] = i;
				sum += areaOfUnionRec( polygons, indices, depth + 1, maxDepth );
			}
			return sum;
		}
	}

	var indices = new Array( polygons.length );
	var sum = 0;
	for( var i = 1; i <= polygons.length; ++i )
	{
		if( i % 2 !== 0 )
		{
			console.log( "+" );
			sum += areaOfUnionRec( polygons, indices, 0, i );
		}
		else
		{
			console.log( "-" );
			sum -= areaOfUnionRec( polygons, indices, 0, i );
		}
	}

	return sum;
}

function areaOfIntersection( polygons )
{
	var intermediate = polygons[ 0 ];
	for( var i = 1; i < polygons.length; ++i )
	{
		intermediate =
			intersectSimplePolygonsDCEL( intermediate, polygons[ i ] );
		if( intermediate === null )
		{
			return 0;
		}
	}
	return intermediate.faces[ 0 ].area();
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
	if( GameState.get() !== GameStates.LevelEditing )
	{
		return;
	}

	if( polygon.length > 1 )
	{
		polygon.length -= 1;
		graphics.levelMeshes.remove(
			graphics.levelMeshes.children[ graphics.levelMeshes.children.length - 1 ] );
		graphics.levelMeshes.remove(
			graphics.levelMeshes.children[ graphics.levelMeshes.children.length - 1 ] );
	}
	else if( polygon.length == 1 )
	{
		polygon.length -= 1;
		graphics.levelMeshes.remove(
			graphics.levelMeshes.children[ graphics.levelMeshes.children.length - 1 ] );
	}
}

function processLevel()
{
	graphics.levelMeshes.add(
		createWall( polygon[ polygon.length - 1 ], polygon[ 0 ] ) );

	dcel = new DCEL().fromVectorList( polygon );

	placePictures();

	var triDCEL = triangulateSimplePolygon( dcel );
	
	var groundMesh = createTriangulationMesh( triDCEL, graphics.floorMaterial );
	graphics.levelMeshes.add( groundMesh );
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

function addDCELFaceMesh( face )
{
	var color = new THREE.Color( Math.floor( 0xffffff * Math.random() ) );

	var obj = new THREE.Object3D();
	visualizeDCEL( face, color, obj );
	graphics.levelMeshes.add( obj );
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
			var normal = iter.normal().multiplyScalar( 0.5 );
			var dir = iter.direction();
			var vecPos = iter.lerp( pos / wallLength ).add( normal );

			var picture = new THREE.Mesh(
				new THREE.PlaneGeometry( size, size ),
				material );

			picture.position.set( vecPos.x, vecPos.y, height );
			picture.lookAt( new THREE.Vector3( normal.x, normal.y, 0 )
			                .add( picture.position ) );

			graphics.levelMeshes.add( picture );

			pictures.push( new Picture(
				iter.lerp( ( pos - 0.5 * size ) / wallLength ),
				iter.lerp( ( pos + 0.5 * size ) / wallLength ),
				picture ) );

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
