var WALLHEIGHT = 100;
var WALLWIDTH = 10;
var PILLARHEIGHT = 103;

var ZAXIS = new THREE.Vector3( 0, 0, 1 );

var stats;
var time;
var keymap = {};

var currentLevel = null;

var polygon = new Array();
var dcel = null;

var guards = new Array();
var pictureVisibility = null;

var selectedGuardType = null;
var currentBudget = 0;
var availableGuards = new Array( GuardTypes.length );

var isInFirstPerson = false;
var firstPersonGuard = null;
var lastFxCamRotation = 0.0;
var lastOverviewCamRotation = 0.0;
var lastOverviewCamPosition = new THREE.Vector3( 0, 0, 700 );
var moveOverviewByDrag = true;
var pickedGuard = null;

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

	time = new THREE.Clock( true );

	graphics.init( update );

	graphics.renderer.domElement.
		addEventListener( "mousedown", onMouseDown, false );
	graphics.renderer.domElement.
		addEventListener( "mousewheel", onMouseScroll, false );

	document.addEventListener( "keydown", onKeyDown, false );
	document.addEventListener( "keyup", onKeyUp, false );

	ui.init();

	Dragging.init();

	LevelEditor.init();

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

		var halfLineIntersection = findClosestDCELHalfLineIntersection(
			dcel, prevPosition, newPosition );

		var closestIntersection = null;
		var intersectedEdge = null;
		if( halfLineIntersection !== null &&
			halfLineIntersection.intersection[ 1 ] < ( 1 + eps ) )
		{
			closestIntersection = halfLineIntersection.intersection;
			intersectedEdge = halfLineIntersection.edge;
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

function restart()
{
	polygon.length = 0;
	graphics.clearLevelMeshes();

	graphics.overview.reset();

	ui.hint.cancel();
}

function getGuardTypeButton( type )
{
	for( var i = 0; i < currentLevel.guardTypes.length; ++i )
	{
		if( GuardTypes[ currentLevel.guardTypes[ i ].type ] == type )
		{
			return ui.guardDetails.buttons.controls[ i ];
		}
	}
}

function selectGuardType( type )
{
	if( selectedGuardType !== null )
	{
		getGuardTypeButton( selectedGuardType ).cssClass( "" );
	}
	selectedGuardType = type;
	if( selectedGuardType !== null )
	{
		getGuardTypeButton( selectedGuardType ).cssClass( "selected" );
	}
}

function addGuardButtons()
{
	for( var i = 0; i < currentLevel.guardTypes.length; ++i )
	{
		var type = GuardTypes[ currentLevel.guardTypes[ i ].type ];
		var button = new UI.Button( "" )
			.position( { top: i * 40, right: 0 } ).show();
		button.onclick( selectGuardType.bind( button, type ) );
		ui.guardDetails.buttons.add( button );
	}
	updateGuardDetails();
}

function removeGuardButtons()
{
	while( ui.guardDetails.buttons.controls.length > 0 )
	{
		ui.guardDetails.buttons.remove(	ui.guardDetails.buttons.controls[ 0 ] );
	}
}

function loadLevelGeometry()
{
	polygon = new Array( currentLevel.geometry.length );
	for( var i = 0; i < currentLevel.geometry.length; ++i )
	{
		polygon[ i ] = new THREE.Vector2(
			currentLevel.geometry[ i ][ 0 ], currentLevel.geometry[ i ][ 1 ] );
	}

	for( var i = 1; i < polygon.length; ++i )
	{
		graphics.levelMeshes.add( graphics.createWallMesh(
			polygon[ i - 1 ], polygon[ i ] ) );
	}

	graphics.levelMeshes.add( graphics.createWallMesh(
		polygon[ polygon.length - 1 ], polygon[ 0 ] ) );

	dcel = new DCEL().fromVectorList( polygon );

	var floorMesh = graphics.createPolygonMesh(
		dcel, graphics.floorMaterial );
	graphics.levelMeshes.add( floorMesh );
}

function placePictures()
{
	for( var i = 0; i < currentLevel.pictures.length; ++i )
	{
		var picture = currentLevel.pictures[ i ];

		var edge = dcel.edges[ picture.edge ];
		var pos = edge.lerp( 0.5 * ( picture.start + picture.end ) );

		var size = ( picture.end - picture.start ) * edge.length();

		var mesh = graphics.createPictureMesh(
			picture.id, pos, edge.normal(), size );
		graphics.levelMeshes.add( mesh );
	}
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

	selectedGuardType = null;
	pickedGuard = null;

	guards.length = 0;

	restart();

	graphics.overview.activate();

	currentLevel = levels[ level ];

	loadLevelGeometry();
	placePictures();

	pictureVisibility = new Array( currentLevel.pictures.length );
	for( var i = 0; i < pictureVisibility.length; ++i )
	{
		pictureVisibility[ i ] = null;
	}

	for( var i = 0; i < availableGuards.length; ++i )
	{
		availableGuards[ i ] = 0;
	}
	for( var i = 0; i < currentLevel.guardTypes.length; ++i )
	{
		availableGuards[ currentLevel.guardTypes[ i ].type ] =
			currentLevel.guardTypes[ i ].quantity;
	}

	currentBudget = currentLevel.budget;

	ui.levelDetails.title.text( currentLevel.name );
	ui.levelDetails.description.text( currentLevel.description );

	GameState.set( GameStates.GuardPlacement );
}

function updateGuardDetails()
{
	ui.guardDetails.budget.text( currentBudget + "$" );

	for( var i = 0; i < currentLevel.guardTypes.length; ++i )
	{
		var index = currentLevel.guardTypes[ i ].type;
		var type = GuardTypes[ index ];
		var button = ui.guardDetails.buttons.controls[ i ];
		var available = availableGuards[ index ];

		button.text( type.cost + "$ - " + type.name + " (" + available + ")" );

		if( ( type.cost > currentBudget || available <= 0 ) &&
			!button.elem.disabled )
		{
			button.disable();
		}
		else if( ( type.cost <= currentBudget && available > 0 ) &&
			button.elem.disabled )
		{
			button.enable();
		}
	}
}

function addGuard( p )
{
	if( selectedGuardType === null ) { return; }

	if( availableGuards[ GuardTypes.indexOf( selectedGuardType ) ] <= 0 )
	{
		ui.hint.display( "You do not have any more guards of this type available.", 2 );
	}
	else if( currentBudget < selectedGuardType.cost )
	{
		ui.hint.display( "You cannot afford this guard.", 2 );
	}
	else
	{
		var guard = selectedGuardType.create( p, dcel );

		graphics.levelMeshes.add( guard.guardMesh );
		graphics.levelMeshes.add( guard.visibilityMesh );

		guards.push( guard );

		currentBudget -= guard.type.cost;
		--availableGuards[ GuardTypes.indexOf( guard.type ) ];
		updateGuardDetails();

		addPictureVisibilityFrom( guard );
	}
}

function moveGuard( guard, p )
{
	removePictureVisibilityFrom( guard );

	graphics.levelMeshes.remove( guard.visibilityMesh );
	guard.move( p, dcel );
	graphics.levelMeshes.add( guard.visibilityMesh );

	addPictureVisibilityFrom( guard );
}

function removeGuard( guard )
{
	removePictureVisibilityFrom( guard );

	graphics.levelMeshes.remove( guard.guardMesh );
	graphics.levelMeshes.remove( guard.visibilityMesh );

	guards.splice( guards.indexOf( guard ), 1 );

	currentBudget += guard.type.cost;
	++availableGuards[ GuardTypes.indexOf( guard.type ) ];
	updateGuardDetails();
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

function onDragStart()
{
}

function onDragStop()
{
	if( pickedGuard !== null )
	{
		var p = graphics.screenToWorldPosition( Dragging.last );
		if( p === null ) { return; }

		if( dcel.faces[ 0 ].contains( p ) )
		{
			moveGuard( pickedGuard, p );
			checkCompletion();
		}
		else
		{
			removeGuard( pickedGuard );
		}
	}
	else
	{
		graphics.overview.mouseDragStop();
	}
}

function onDragMove()
{
	if( isInFirstPerson )
	{
		graphics.fxView.camera.rotation.y =
			( lastFxCamRotation - Dragging.delta.x / 250.0 );
	}
	else if( pickedGuard === null )
	{
		graphics.overview.mouseDrag( Dragging.delta );
	}
	else
	{
		var p = graphics.screenToWorldPosition( Dragging.last );
		if( p !== null )
		{
			pickedGuard.guardMesh.position.set( p.x, p.y, 0 );
		}
	}
}

function onMouseDown( event )
{
	event.preventDefault();

	if( GameState.get() === GameStates.GuardPlacement )
	{
		document.addEventListener( "mouseup", onMouseUp, false );

		var coord = new THREE.Vector2( event.clientX,
									   graphics.HEIGHT - event.clientY );

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
	document.removeEventListener( "mouseup", onMouseUp, false );

	var coord = new THREE.Vector2( event.clientX,
	                               graphics.HEIGHT - event.clientY );

	if( GameState.get() === GameStates.GuardPlacement &&
		!Dragging.effective )
	{
		if( !isInFirstPerson )
		{
			if( pickedGuard === null )
			{
				var p = graphics.screenToWorldPosition( coord );
				if( p === null ) { return; }

				if( dcel.faces[ 0 ].contains( p ) )
				{
					addGuard( p );
					checkCompletion();
				}
			}
			else
			{
				switchToFirstPerson( pickedGuard );
				pickedGuard = null;
			}
		}
		else
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

function onMouseScroll( event )
{
	var e = window.event || event;
	var delta = ( e.detail ? e.detail : e.wheelDelta / 120 );

	if( !isInFirstPerson )
	{
		graphics.overview.mouseScroll( delta );
	}

	return false;
}

function switchToFirstPerson( guard )
{
	isInFirstPerson = true;
	firstPersonGuard = guard;

	graphics.overview.deactivate();

	graphics.fxView.camera.position.set(
		guard.position.x,
		guard.position.y,
		WALLHEIGHT / 2 );
	graphics.fxView.camera.rotation.set( Math.PI / 2, lastFxCamRotation, 0 );
	graphics.fxView.camera.up.set( 0, 0, 1 );

	graphics.levelMeshes.remove( guard.guardMesh );
	guard.guardMesh.position.set( 0, 0, 0 );
	graphics.fxView.camera.add( guard.guardMesh );

	graphics.lookDirArrow.visible = true;

	graphics.levelMeshes.remove( guard.visibilityMesh );

	ui.ingameMenu.overviewButton.show();
}

function switchToOverview()
{
	ui.ingameMenu.overviewButton.hide();

	var guard = firstPersonGuard;

	graphics.lookDirArrow.visible = false;

	graphics.fxView.camera.remove( guard.guardMesh );
	moveGuard( firstPersonGuard,
		new THREE.Vector2(
			graphics.fxView.camera.position.x,
			graphics.fxView.camera.position.y ) );
	graphics.levelMeshes.add( guard.guardMesh );

	graphics.overview.activate();

	isInFirstPerson = false;
	firstPersonGuard = null;

	checkCompletion();
}

function isPictureOnEdge( picture, edge )
{
	var eps = 0.01;

	function isPointOnSegment( p, a, b )
	{
		var line = b.clone().sub( a );
		var proj = line.dot( p.clone().sub( a ) ) / line.lengthSq();

		return ( proj > -eps && proj < 1.0 + eps );
	}

	var start = dcel.edges[ picture.edge ].lerp( picture.start );
	var end = dcel.edges[ picture.edge ].lerp( picture.end );

	var intersection = extendedLineIntersection(
		start, end, edge.origin.pos, edge.next.origin.pos );

	return ( intersection === null &&
		Math.abs( edge.pointDistance( start ) ) < eps &&
		( isPointOnSegment( start, edge.origin.pos, edge.next.origin.pos ) ||
		  isPointOnSegment( end,   edge.origin.pos, edge.next.origin.pos ) ||
		  isPointOnSegment( edge.origin.pos,      start, end ) ||
		  isPointOnSegment( edge.next.origin.pos, start, end ) ) );
}

function addPictureVisibilityFrom( guard )
{
	for( var i = 0; i < currentLevel.pictures.length; ++i )
	{
		if( pictureVisibility[ i ] !== null ) { continue; }

		for( var j = 0; j < guard.polygon.edges.length; ++j )
		{
			if( isPictureOnEdge( currentLevel.pictures[ i ],
			                     guard.polygon.edges[ j ] ) )
			{
				pictureVisibility[ i ] = guard;
				break;
			}
		}
	}
}

function removePictureVisibilityFrom( guard )
{
	for( var i = 0; i < currentLevel.pictures.length; ++i )
	{
		if( pictureVisibility[ i ] === guard )
		{
			pictureVisibility[ i ] = null;
		}
	}
}

function checkCompletion()
{
	var completed = true;
	for( var i = 0; i < pictureVisibility.length; ++i )
	{
		if( pictureVisibility[ i ] === null )
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
