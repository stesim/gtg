var WALLHEIGHT = 100;
var WALLWIDTH = 10;
var PILLARHEIGHT = 103;
var VISIBILITY_THRESHOLD = 2;
var TRANSLATION_RADIUS = 15;
var ROTATION_RADIUS = 25;

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
var moveOverviewByDrag = true;
var pickedGuard = null;
var rotatePickedGuard = false;
var guardStartRotation = 0.0;

var rotationMesh = null;

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

	graphics.onTexturesLoaded = function()
	{
		UI.hide( UI.get( "loading" ) );

		LevelEditor.init();

		GameState.set( GameStates.Menu );

		graphics.render();
	}
	graphics.init( update );

	rotationMesh = new THREE.Mesh(
		new THREE.CircleGeometry( ROTATION_RADIUS, 16 ),
		new THREE.MeshBasicMaterial( { color: 0xffffff } ) );
	rotationMesh.position.z = 1;

	var rotationLineGeom = new THREE.Geometry();
	rotationLineGeom.vertices.push(
		new THREE.Vector3( 0, 0, 0 ),
		new THREE.Vector3( ROTATION_RADIUS, 0, 0 ) );
	var rotationLine = new THREE.Line(
		rotationLineGeom,
		new THREE.LineBasicMaterial( { color: 0x000000 } ) );
	rotationLine.position.z = 0.1;
	rotationMesh.add( rotationLine );

	graphics.renderer.domElement.
		addEventListener( "mousedown", onMouseDown, false );
	graphics.renderer.domElement.
		addEventListener( "mousewheel", onMouseScroll, false );
	graphics.renderer.domElement.
		addEventListener( "mousemove", onMouseMove, false );

	document.addEventListener( "keydown", onKeyDown, false );
	document.addEventListener( "keyup", onKeyUp, false );

	ui.init();

	UI.get( "completed-retry" ).onclick = function()
	{
		loadLevel( currentLevel );
	};
	UI.get( "completed-next" ).onclick = function()
	{
		var currentIndex = levels.indexOf( currentLevel );
		if( currentIndex >= 0 )
		{
			loadLevel( levels[ currentIndex + 1 ] );
		}
	};

	Dragging.init();

	graphics.disableRendering();
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

		var halfLineIntersection = findClosestDCELFaceHalfLineIntersection(
			dcel, dcel.faces[ 0 ], prevPosition, newPosition );

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
	polygon = toVectorArray( currentLevel.geometry );
	
	var holes = new Array();
	if( currentLevel.holes )
	{
		for( var i = 0; i < currentLevel.holes.length; ++i )
		{
			holes.push( toVectorArray( currentLevel.holes[ i ] ) );
		}
	}

	dcel = new DCEL().fromVectorList( polygon, holes );

	graphics.levelMeshes.add( graphics.createLevelMeshes( dcel ) );
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

function toVectorArray( level )
{
	var res = new Array( level.length );
	for( var i = 0; i < level.length; ++i )
	{
		res[ i ] = new THREE.Vector2( level[ i ][ 0 ], level[ i ][ 1 ] );
	}
	return res;
}

function loadLevel( level )
{
	GameStates.SplashScreen.previousLevel = currentLevel;

	GameState.set( GameStates.LevelLoading );

	selectedGuardType = null;
	pickedGuard = null;

	guards.length = 0;

	restart();

	graphics.overview.activate();

	currentLevel = level;

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

	GameState.set( GameStates.SplashScreen );
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

	guard.move( p, dcel );

	addPictureVisibilityFrom( guard );
}

function rotateGuard( guard, dir )
{
	removePictureVisibilityFrom( guard );

	guard.rotate( dir, dcel );

	addPictureVisibilityFrom( guard );
}

function removeGuard( guard )
{
	removePictureVisibilityFrom( guard );

	guard.removeMeshes();
	guards.splice( guards.indexOf( guard ), 1 );

	currentBudget += guard.type.cost;
	++availableGuards[ GuardTypes.indexOf( guard.type ) ];
	updateGuardDetails();
}

function findGuardNear( p, distance )
{
	var threshold = ( distance ? distance : 15.0 );
	var current = null;
	var currentDist = Infinity;
	for( var i = 0; i < guards.length; ++i )
	{
		var dist = p.distanceTo( guards[ i ].position );
		if( dist < threshold &&
			( current === null || dist < currentDist ) )
		{
			current = guards[ i ];
			currentDist = dist;
		}
	}
	return current;
}

function updateRotationMesh( p )
{
	var guard = findGuardNear( p, ROTATION_RADIUS );

	if( guard !== null && rotationMesh.parent !== guard.guardMesh )
	{
		guard.guardMesh.add( rotationMesh );
	}
	else if( guard === null && rotationMesh.parent !== null )
	{
		rotationMesh.parent.remove( rotationMesh );
	}
}

function onDragStart()
{
	if( !isInFirstPerson && pickedGuard !== null )
	{
		if( pickedGuard.visibilityMesh !== null )
		{
			pickedGuard.visibilityMesh.visible = false;
		}
		if( rotatePickedGuard )
		{
			guardStartRotation = pickedGuard.direction;
		}
	}
}

function onDragStop()
{
	if( !isInFirstPerson )
	{
		if( pickedGuard !== null )
		{
			var p = graphics.screenToWorldPosition( Dragging.last );
			if( p === null ) { return; }

			if( !rotatePickedGuard )
			{
				if( dcel.isPointInFace( p, dcel.faces[ 0 ] ) )
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
				rotateGuard( pickedGuard, pickedGuard.guardMesh.rotation.z );
				checkCompletion();

				updateRotationMesh( p );
			}
		}
		else
		{
			graphics.overview.mouseDragStop();
		}
	}
	else
	{
		lastFxCamRotation = clampAngle( graphics.fxView.camera.rotation.y );
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
			if( !rotatePickedGuard )
			{
				pickedGuard.guardMesh.position.set( p.x, p.y, 0 );
			}
			else
			{
				var delta = p.clone().sub( pickedGuard.position );
				if( Math.abs( delta.x ) >= eps || Math.abs( delta.y ) >= eps )
				{
					var dir = Math.atan2( delta.y, delta.x );
					pickedGuard.guardMesh.rotation.z = dir;
				}
				else
				{
					pickedGuard.guardMesh.rotation.z = guardStartRotation;
				}
			}
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

			pickedGuard = findGuardNear( p, TRANSLATION_RADIUS );

			if( pickedGuard === null )
			{
				pickedGuard = findGuardNear( p, ROTATION_RADIUS );
				rotatePickedGuard = true;
			}
			else
			{
				rotatePickedGuard = false;
			}
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

				if( dcel.isPointInFace( p, dcel.faces[ 0 ] ) )
				{
					addGuard( p );
					checkCompletion();

					updateRotationMesh( p );
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
			if( p !== null && dcel.isPointInFace( p, dcel.faces[ 0 ] ) )
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

	if( GameState.get() === GameStates.GuardPlacement && !isInFirstPerson )
	{
		var delta = ( e.detail ? e.detail : e.wheelDelta / 120 );

		graphics.overview.mouseScroll( delta );
	}

	return false;
}

function onMouseMove( event )
{
	if( !Dragging.active )
	{
		var coord =
			new THREE.Vector2( event.clientX, graphics.HEIGHT - event.clientY );

		var p = graphics.screenToWorldPosition( coord );
		if( p === null ) { return; }

		updateRotationMesh( p );
	}
}

function switchToFirstPerson( guard )
{
	isInFirstPerson = true;
	firstPersonGuard = guard;
	lastFxCamRotation = guard.direction - 0.5 * Math.PI;

	graphics.overview.deactivate();

	graphics.fxView.camera.position.set(
		guard.position.x,
		guard.position.y,
		WALLHEIGHT / 2 );
	graphics.fxView.camera.rotation.set( Math.PI / 2, lastFxCamRotation, 0 );
	graphics.fxView.camera.up.set( 0, 0, 1 );

	graphics.levelMeshes.remove( guard.guardMesh );
	guard.guardMesh.position.set( 0, 0, 0 );
	guard.guardMesh.rotation.z = 0; // TODO: HACK
	graphics.fxView.camera.add( guard.guardMesh );

	graphics.lookDirArrow.visible = true;

	graphics.hideVisibilityInFxView = true;
	if( guard.visibilityMesh !== null )
	{
		guard.visibilityMesh.visible = false;
	}

	guard.type.previewMesh.rotation.set( 0, 0.5 * Math.PI, 0 );
	guard.type.previewMesh.material = graphics.visibilityMaterial;
	guard.guardMesh.add( guard.type.previewMesh );

	if( guard.type.enterFirstPerson )
	{
		guard.type.enterFirstPerson();
	}

	ui.ingameMenu.overviewButton.show();
}

function switchToOverview()
{
	ui.ingameMenu.overviewButton.hide();

	var guard = firstPersonGuard;
	if( guard.type.exitFirstPerson )
	{
		guard.type.exitFirstPerson();
	}
	guard.direction = graphics.fxView.camera.rotation.y + 0.5 * Math.PI;

	graphics.lookDirArrow.visible = false;

	graphics.hideVisibilityInFxView = false;

	guard.guardMesh.remove( guard.type.previewMesh );

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

	return ( Math.abs( edge.pointDistance( start ) ) < VISIBILITY_THRESHOLD &&
		( isPointOnSegment( start, edge.origin.pos, edge.next.origin.pos ) ||
		  isPointOnSegment( end,   edge.origin.pos, edge.next.origin.pos ) ||
		  isPointOnSegment( edge.origin.pos,      start, end ) ||
		  isPointOnSegment( edge.next.origin.pos, start, end ) ) );
}

function isPictureVisibleByGuard( picture, guard )
{
	if( guard.polygon.vertices.length == 1 )
	{
		return isPointOnSegment(
			guard.polygon.vertices[ 0 ].pos,
			dcel.edges[ picture.edge ].lerp( picture.start ),
			dcel.edges[ picture.edge ].lerp( picture.end ) );
	}
	else
	{
		for( var j = 0; j < guard.polygon.edges.length; ++j )
		{
			if( isPictureOnEdge( picture, guard.polygon.edges[ j ] ) )
			{
				return true;
			}
		}
		return false;
	}
}

function addPictureVisibilityFrom( guard )
{
	for( var i = 0; i < currentLevel.pictures.length; ++i )
	{
		if( pictureVisibility[ i ] !== null ) { continue }

		for( var j = 0; j < guards.length; ++j )
		{
			var guard = guards[ j ];
			if( isPictureVisibleByGuard( currentLevel.pictures[ i ], guard ) )
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

function checkPictureCompletion()
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

function checkAreaCompletion()
{
	if( guards.length <= 0 ) { return; }

	var sum = guards[ 0 ].polygon;
	for( var i = 1; i < guards.length; ++i )
	{
		sum = union( sum, guards[ i ].polygon );
	}

	var guardedArea = 0;
	for( var i = 0; i < sum.faces.length; ++i )
	{
		if( sum.faces[ i ].tag )
		{
			guardedArea += sum.faceArea( sum.faces[ i ] );
		}
	}

	var totalArea = 0;
	for( var i = 0; i < dcel.faces.length; ++i )
	{
		if( dcel.faces[ i ].tag )
		{
			totalArea += dcel.faceArea( dcel.faces[ i ] );
		}
	}

	console.log( guardedArea + " / " + totalArea + " (" + ( 100 * guardedArea / totalArea ) + "%)" );

	if( guardedArea / totalArea >= 0.998 )
	{
		GameState.set( GameStates.LevelCompleted );
	}
}

function checkCompletion()
{
	checkAreaCompletion();
}
