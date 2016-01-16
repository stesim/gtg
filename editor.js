var LevelEditor =
{

NORMALIZATION_SIZE: 1000,
SNAP_THRESHOLD: 20,
MIN_PICTURE_SIZE: 20,
PICTUREOFFSETMIN: 30,
PICTUREOFFSETMAX: 150,

geometryFinished: false,
picturesFinished: false,
faces: new Array(),
points: new Array(),
dcel: null,
pillarMesh: null,
pictures: new Array(),
pictureMeshes: new Array(),
levelMeshes: null,
helperMesh: null,
mouseUpHandler: null,
mouseMoveHandler: null,
mouseScrollHandler: null,

selectedPictureID: 0,
currentPictureSize: 20,
currentPicturePreview: null,

UI:
{
	title:           UI.get( "editor-title" ),

	menu:            UI.get( "editor-menu" ),
	quit:            UI.get( "editor-quit" ),
	newLevel:        UI.get( "editor-new" ),
	undo:            UI.get( "editor-undo" ),
	finish:          UI.get( "editor-finish" ),
	pickerWrapper:   UI.get( "editor-pickerwrapper" ),
	filePicker:      UI.get( "editor-filepicker" ),
	random:          UI.get( "editor-random" ),
	normalize:       UI.get( "editor-normalize" ),

	properties:      UI.get( "editor-properties" ),
	name:            UI.get( "editor-name" ),
	description:     UI.get( "editor-description" ),
	budget:          UI.get( "editor-budget" ),
	guardTypes:      UI.get( "editor-guardtypes" ),
	guardQuantities: [],
	accept:          UI.get( "editor-accept" ),
	exportWrapper:   UI.get( "editor-exportwrapper" ),
	exportLink:      UI.get( "editor-exportlink" ),
	reset:           UI.get( "editor-reset" ),
},

Picture: function( id, edge, start, end )
{
	this.id = id;
	this.edge = edge;
	this.start = start;
	this.end = end;
},


init: function()
{
	this.faces.push( this.points );

	this.levelMeshes = new THREE.Object3D();

	this.currentPictureSize = LevelEditor.MIN_PICTURE_SIZE;

	this.helperMesh = new THREE.Mesh(
		new THREE.PlaneGeometry( 1, 1 ),
		graphics.pictureMaterials[ this.selectedPictureID ] );
	this.helperMesh.scale.set(
		this.currentPictureSize, this.currentPictureSize, 1 );
	this.helperMesh.visible = false;

	this.pillarMesh = graphics.createPillarMesh( new THREE.Vector3() );
	this.pillarMesh.visible = false;

	this.mouseUpHandler = this.onMouseUp.bind( this );
	this.mouseMoveHandler = this.onMouseMove.bind( this );
	this.mouseScrollHandler = this.onMouseScroll.bind( this );

	this.UI.quit.onclick = function() { GameState.set( GameStates.Menu ); };
	this.UI.newLevel.onclick = ( function() { this.reset(); } ).bind( this );
	this.UI.undo.onclick = this.undo.bind( this );
	this.UI.finish.onclick = this.finalize.bind( this );

	this.UI.filePicker.onchange = ( function()
	{
		var reader = new FileReader();
		reader.onload = ( function()
		{
			this.importGeometry( reader.result );
		} ).bind( this );

		reader.readAsText( this.UI.filePicker.files[ 0 ] );
	} ).bind( this );
	
	this.UI.random.onclick = this.placeRandomPictures.bind( this );

	this.UI.normalize.onclick = ( function()
	{
		this.normalizeGeometry();

		graphics.levelMeshes.remove( this.levelMeshes );
		this.levelMeshes = new THREE.Object3D();
		graphics.levelMeshes.add( this.levelMeshes );

		this.addGeometryMeshes();
		this.repositionPictureMeshes();

		UI.disable( this.UI.normalize );
	} ).bind( this );

	this.UI.accept.onclick = this.acceptProperties.bind( this );
	this.UI.reset.onclick = this.resetProperties.bind( this );

	for( var i = 0; i < GuardTypes.length; ++i )
	{
		var guard = GuardTypes[ i ];

		var label = UI.create( "label" );
		var number = UI.create( "input" );
		number.className = "editor-quantity";
		number.type = "number";

		label.appendChild( number );
		label.appendChild( UI.text( guard.name + " (" + guard.cost + "$)" ) );

		this.UI.guardTypes.appendChild( label );
		this.UI.guardTypes.appendChild( UI.linebreak() );

		this.UI.guardQuantities.push( number );
	}

	this.reset( true );
},

reset: function( initial )
{
	if( initial === undefined || !initial )
	{
		graphics.levelMeshes.remove( this.levelMeshes );
		this.levelMeshes = new THREE.Object3D();
		graphics.levelMeshes.add( this.levelMeshes );

		graphics.overview.reset();

		if( this.geometryFinished && !this.picturesFinished )
		{
			this.finalizePictures();
		}
	}

	this.geometryFinished = false;
	this.picturesFinished = false;
	this.faces.length = 1;
	this.faces[ 0 ] = this.points;
	this.points.length = 0;
	this.dcel = null;
	this.pictures.length = 0;
	this.pictureMeshes.length = 0;

	this.helperMesh.visible = false;
	this.pillarMesh.visible = false;

	UI.setText( this.UI.title, "Construct level geometry" );

	UI.hide( this.UI.random );

	UI.hide( this.UI.normalize );
	UI.enable( this.UI.normalize );

	this.UI.filePicker.value = null;
	UI.show( this.UI.pickerWrapper );

	UI.show( this.UI.undo );
	UI.show( this.UI.finish );

	UI.hide( this.UI.properties );

	this.resetProperties();
},

onLoad: function()
{
	graphics.levelMeshes.add( this.levelMeshes );
	graphics.levelMeshes.add( this.helperMesh );
	graphics.levelMeshes.add( this.pillarMesh );

	graphics.overview.activate();
	Dragging.onstart = this.onDragStart.bind( this );
	Dragging.onmove = this.onDragMove.bind( this );
	Dragging.onstop = this.onDragStop.bind( this );

	UI.show( this.UI.title );

	UI.show( this.UI.menu );

	graphics.renderer.domElement.addEventListener(
		"mouseup", this.mouseUpHandler, false );
},

onExit: function()
{
	this.reset();

	graphics.levelMeshes.remove( this.levelMeshes );
	graphics.levelMeshes.remove( this.helperMesh );
	graphics.levelMeshes.remove( this.pillarMesh );

	graphics.overview.deactivate();
	Dragging.onstart = null;
	Dragging.onmove = null;
	Dragging.onstop = null;

	UI.hide( this.UI.menu );

	UI.hide( this.UI.title );

	graphics.renderer.domElement.removeEventListener(
		"mouseup", this.mouseUpHandler, false );
},

onMouseUp: function( event )
{
	event.preventDefault();
	if( Dragging.effective ) { return; }

	var coord =
		new THREE.Vector2( event.clientX, graphics.HEIGHT - event.clientY );

	if( !this.geometryFinished )
	{
		var p = graphics.screenToWorldPosition( coord );
		if( p === null ) { return; }

		if( this.points.length > 0 &&
			p.distanceTo( this.points[ 0 ] ) < this.SNAP_THRESHOLD )
		{
			this.finalizeFace();
			this.startFace();
			return;
		}

		this.points.push( p );

		if( this.points.length > 1 )
		{
			this.levelMeshes.add( graphics.createWallMesh(
				this.points[ this.points.length - 2 ], p ) );
		}
		else
		{
			this.pillarMesh.position.x = p.x;
			this.pillarMesh.position.y = p.y;
			this.pillarMesh.visible = true;
		}
	}
	else if( !this.picturesFinished && this.currentPicturePreview !== null )
	{
		var edgeIndex = this.dcel.edges.indexOf(
			this.currentPicturePreview.edge );
		for( var i = 0; i < this.pictures.length; ++i )
		{
			var picture = this.pictures[ i ];
			if( picture.edge == edgeIndex &&
				picture.start < this.currentPicturePreview.localCoordinate &&
				this.currentPicturePreview.localCoordinate < picture.end )
			{
				this.removePicture( picture );
				return;
			}
		}

		var halfLocalPicSize = 0.5 * this.currentPictureSize /
			this.currentPicturePreview.edge.length();

		this.addPicture(
			this.selectedPictureID,
			this.dcel.edges.indexOf( this.currentPicturePreview.edge ),
			this.currentPicturePreview.localCoordinate - halfLocalPicSize,
			this.currentPicturePreview.localCoordinate + halfLocalPicSize );
	}
},

importGeometry: function( svg )
{
	this.reset();

	var points = this.parseSvg( svg );

	if( points !== null )
	{
		this.points = points;
		this.faces[ 0 ] = this.points;

		this.startFace();

		this.finalizeGeometryState();

		this.addGeometryMeshes();
	}
},

startFace: function()
{
	this.points = new Array();
	this.faces.push( this.points );
},

removeEmptyFace: function()
{
	if( this.faces.length > 1 && this.points.length === 0 )
	{
		this.faces.pop();
		this.points = this.faces[ this.faces.length - 1 ];
	}
},

finalizeFace: function()
{
	this.removeEmptyFace();

	if( this.points.length > 2 )
	{
		if( this.pillarMesh.visible )
		{
			this.pillarMesh.visible = false;
		}

		this.levelMeshes.add( graphics.createWallMesh(
			this.points[ this.points.length - 1 ], this.points[ 0 ] ) );
		return true;
	}
	return false;
},

finalizeGeometry: function()
{
	if( !this.finalizeFace() )
	{
		return false;
	}

	var holes = this.faces.slice( 1 );

	this.dcel = new DCEL().fromVectorList( this.faces[ 0 ], holes, true );

	var floorMesh =
		graphics.createPolygonMesh( this.dcel, graphics.floorMaterial );
	this.levelMeshes.add( floorMesh );
	return true;
},

finalizeGeometryState: function()
{
	if( this.finalizeGeometry() )
	{
		UI.hide( this.UI.pickerWrapper );

		UI.show( this.UI.random );

		UI.show( this.UI.normalize );

		UI.setText( this.UI.title, "Place pictures" );

		this.geometryFinished = true;

		document.addEventListener( "mousemove", this.mouseMoveHandler, false );
		document.addEventListener( "mousewheel", this.mouseScrollHandler, false );
	}
},

finalizePictures: function()
{
	document.removeEventListener( "mousemove", this.mouseMoveHandler, false );
	document.removeEventListener( "mousewheel", this.mouseMoveHandler, false );

	this.picturesFinished = true;
},

finalizePictureState: function()
{
	this.finalizePictures();

	UI.setText( this.UI.title, "Level settings" );

	UI.hide( this.UI.undo );
	UI.hide( this.UI.finish );

	UI.hide( this.UI.random );

	UI.hide( this.UI.normalize );

	UI.show( this.UI.properties );
},

finalize: function()
{
	if( !this.geometryFinished )
	{
		this.finalizeGeometryState();
	}
	else if( !this.picturesFinished )
	{
		this.finalizePictureState();
	}
},

addGeometryMeshes: function()
{
	this.levelMeshes.add( graphics.createLevelMeshes( this.dcel ) );
},

undoWall: function()
{
	if( this.points.length > 0 )
	{
		if( this.points.length > 1 )
		{
			this.levelMeshes.remove( this.levelMeshes.children[
				this.levelMeshes.children.length - 1 ] );
		}
		else
		{
			this.pillarMesh.visible = false;
		}

		this.points.pop();
	}
	else if( this.faces.length > 1 )
	{
		this.removeEmptyFace();
		this.levelMeshes.remove( this.levelMeshes.children[
			this.levelMeshes.children.length - 1 ] );

		this.pillarMesh.position.x = this.points[ 0 ].x;
		this.pillarMesh.position.y = this.points[ 0 ].y;
		this.pillarMesh.visible = true;
	}
},

undoPicture: function()
{
	if( this.pictures.length > 0 )
	{
		this.pictures.pop();
		this.levelMeshes.remove( this.pictureMeshes.pop() );
	}
},

undo: function()
{
	if( !this.geometryFinished )
	{
		this.undoWall();
	}
	else if( !this.picturesFinished )
	{
		this.undoPicture();
	}
},

clampPossiblePicturePosition: function( edge, position, size )
{
	var halfLocalPicSize = 0.5 * size / edge.length();
	if( halfLocalPicSize > 0.5 )
	{
		return null;
	}
	else if( position - halfLocalPicSize < eps )
	{
		return halfLocalPicSize;
	}
	else if( position + halfLocalPicSize > ( 1 - eps ) )
	{
		return ( 1 - halfLocalPicSize );
	}
	else
	{
		return position;
	}
},

determinePossiblePicturePosition: function( p )
{
	var closestEdge = findClosestDCELFaceEdge(
		this.dcel, this.dcel.faces[ 0 ], p );
	if( closestEdge.distance < LevelEditor.SNAP_THRESHOLD )
	{
		closestEdge.localCoordinate = this.clampPossiblePicturePosition(
			closestEdge.edge,
			closestEdge.localCoordinate,
			this.currentPictureSize );

		if( closestEdge.localCoordinate === null )
		{
			return null;
		}

		return { edge: closestEdge.edge,
			localCoordinate: closestEdge.localCoordinate };
	}
	else
	{
		return null;
	}
},

updateHelperPosition: function()
{
	if( this.currentPicturePreview !== null )
	{
		var projPos = this.currentPicturePreview.edge.lerp(
			this.currentPicturePreview.localCoordinate );
		var normal = this.currentPicturePreview.edge.normal();

		this.helperMesh.position.set(
			projPos.x + 0.5 * normal.x,
			projPos.y + 0.5 * normal.y,
			0.5 * WALLHEIGHT );

		this.helperMesh.lookAt( new THREE.Vector3(
			this.helperMesh.position.x + normal.x,
			this.helperMesh.position.y + normal.y,
			this.helperMesh.position.z ) );

		this.helperMesh.visible = true;
	}
	else
	{
		this.helperMesh.visible = false;
	}
},

onMouseMove: function( event )
{
	if( !Dragging.active )
	{
		var coord =
			new THREE.Vector2( event.clientX, graphics.HEIGHT - event.clientY );

		var p = graphics.screenToWorldPosition( coord );
		if( p === null ) { return; }

		this.currentPicturePreview = this.determinePossiblePicturePosition( p );

		this.updateHelperPosition( p );
	}
},

updateHelperSize: function()
{
	if( this.currentPictureSize > this.helperMesh.scale.y )
	{
		var originalPosition = this.currentPicturePreview.localCoordinate;
		this.currentPicturePreview.localCoordinate =
			this.clampPossiblePicturePosition(
				this.currentPicturePreview.edge,
				this.currentPicturePreview.localCoordinate,
				this.currentPictureSize );

		if( this.currentPicturePreview.localCoordinate !== originalPosition )
		{
			this.updateHelperPosition();
		}
	}

	this.helperMesh.scale.set(
		this.currentPictureSize, this.currentPictureSize, 1 );
},

onMouseScroll: function( event )
{
	var e = window.event || event;
	var delta = ( e.detail ? e.detail : e.wheelDelta / 120 );
	if( delta === 0 ) { return; }

	if( this.currentPicturePreview !== null )
	{
		this.currentPictureSize = clamp(
			this.currentPictureSize + delta * 5,
			LevelEditor.MIN_PICTURE_SIZE,
			Math.min( WALLHEIGHT, this.currentPicturePreview.edge.length() ) );

		this.updateHelperSize();
	}
	else
	{
		graphics.overview.mouseScroll( delta );
	}
},

addPicture: function( id, edgeIndex, start, end )
{
	var edge = this.dcel.edges[ edgeIndex ];
	var pos = edge.lerp( 0.5 * ( start + end ) );

	var size = ( end - start ) * edge.length();

	var mesh = graphics.createPictureMesh( id, pos, edge.normal(), size );

	this.pictureMeshes.push( mesh );
	this.levelMeshes.add( mesh );

	this.pictures.push( new LevelEditor.Picture( id, edgeIndex, start, end ) );
},

removePicture: function( picture )
{
	var index = this.pictures.indexOf( picture );
	this.pictures.splice( index, 1 );

	this.levelMeshes.remove( this.pictureMeshes[ index ] );
	this.pictureMeshes.splice( index, 1 );
},

placeRandomPictures: function()
{
	function randOffset()
	{
		var r = Math.random();
		return ( r * LevelEditor.PICTUREOFFSETMIN +
			( 1 - r ) * LevelEditor.PICTUREOFFSETMAX ); 
	}

	while( this.pictures.length > 0 )
	{
		this.undoPicture();
	}

	for( var i = 0; i < this.dcel.edges.length; ++i )
	{
		var edge = this.dcel.edges[ i ];
		if( edge.face === this.dcel.faces[ 0 ] )
		{
			var wallLength = edge.length();
			var size;
			var pos;
			if( wallLength < LevelEditor.MIN_PICTURE_SIZE +
					2 * LevelEditor.PICTUREOFFSETMIN )
			{
				continue;
			}
			else
			{
				pos = randOffset();
				if( pos + LevelEditor.MIN_PICTURE_SIZE >= wallLength )
				{
					pos = Math.max(
						pos - LevelEditor.PICTUREOFFSETMIN,
						LevelEditor.PICTUREOFFSETMIN );
				}
				size = Math.max( LevelEditor.MIN_PICTURE_SIZE,
					Math.min( wallLength - pos, WALLHEIGHT ) *
						( 0.2 + Math.random() * 0.6 ) );
			}

			while( wallLength >= pos + size + LevelEditor.PICTUREOFFSETMIN )
			{
				var id = Math.floor( Math.random() *
					graphics.pictureMaterials.length );

				this.addPicture(
					id,
					i,
					pos / wallLength,
					( pos + size ) / wallLength );

				pos += size + randOffset();
				size = LevelEditor.MIN_PICTURE_SIZE +
					Math.random() * ( WALLHEIGHT - LevelEditor.MIN_PICTURE_SIZE );
			}
		}
	}
},

repositionPictureMeshes: function()
{
	for( var i = 0; i < this.pictures.length; ++i )
	{
		var picture = this.pictures[ i ];
		var edge = this.dcel.edges[ picture.edge ];
		var pos = edge.lerp( 0.5 * ( picture.start + picture.end ) );

		var size = ( picture.end - picture.start ) * edge.length();

		var mesh = graphics.createPictureMesh(
			picture.id, pos, edge.normal(), size );
		this.levelMeshes.add( mesh );

		this.pictureMeshes[ i ] = mesh;
	}
},

createExportLink: function()
{
	var points = new Array( this.faces[ 0 ].length );
	for( var i = 0; i < this.faces[ 0 ].length; ++i )
	{
		points[ i ] = [ this.faces[ 0 ][ i ].x, this.faces[ 0 ][ i ].y ];
	}
	var holes = new Array( this.faces.length - 1 );
	for( var i = 0; i < this.faces.length - 1; ++i )
	{
		var face = this.faces[ i + 1 ];
		var hole = new Array( face.length );
		for( var j = 0; j < hole.length; ++j )
		{
			hole[ j ] = [ face[ j ].x, face[ j ].y ];
		}
		holes[ i ] = hole;
	}

	var guardTypes = new Array();
	for( var i = 0; i < this.UI.guardQuantities.length; ++i )
	{
		if( this.UI.guardQuantities[ i ].value > 0 )
		{
			guardTypes.push(
				{
					type: i,
					quantity: parseInt( this.UI.guardQuantities[ i ].value )
				} );
		}
	}

	var level = new Level(
		this.UI.name.value,
		this.UI.description.value,
		parseInt( this.UI.budget.value ),
		guardTypes,
		points,
		holes,
		this.pictures,
		2 );

	var txt = "levels.push(" + JSON.stringify( level ) + ");";

	var blob = new Blob( [ txt ], { type: "application/javascript" } );
	return URL.createObjectURL( blob );
},

acceptProperties: function()
{
	var link = this.createExportLink();
	this.UI.exportLink.href = link;

	UI.disable( this.UI.name );
	UI.disable( this.UI.description );
	UI.disable( this.UI.budget );
	for( var i = 0; i < this.UI.guardQuantities.length; ++i )
	{
		UI.disable( this.UI.guardQuantities[ i ] );
	}

	UI.hide( this.UI.accept );
	UI.show( this.UI.exportWrapper );
},

resetProperties: function()
{
	UI.hide( this.UI.exportWrapper );
	UI.show( this.UI.accept );

	this.UI.name.value = "";
	this.UI.description.value = "";
	this.UI.budget.value = 0;

	UI.enable( this.UI.name );
	UI.enable( this.UI.description );
	UI.enable( this.UI.budget );
	for( var i = 0; i < this.UI.guardQuantities.length; ++i )
	{
		this.UI.guardQuantities[ i ].value = 0;
		UI.enable( this.UI.guardQuantities[ i ] );
	}
},

parseSvg: function( svg )
{
	var svgContainer = UI.create( "div" );
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
},

normalizeGeometry: function()
{
	var points = this.faces[ 0 ];

	if( points.length <= 0 ) { return; }

	var size = this.NORMALIZATION_SIZE;

	var xmin = points[ 0 ].x;
	var xmax = xmin;
	var ymin = points[ 0 ].y;
	var ymax = ymin;
	for( var i = 1; i < points.length; ++i )
	{
		var p = points[ i ];
		if( p.x < xmin )      { xmin = p.x; }
		else if( p.x > xmax ) { xmax = p.x; }

		if( p.y < ymin )      { ymin = p.y; }
		else if( p.y > ymax ) { ymax = p.y; }
	}

	var scale = Math.min( size / ( xmax - xmin ), size / ( ymax - ymin ) );
	var center = new THREE.Vector2(
		0.5 * ( xmax + xmin ),
		0.5 * ( ymax + ymin ) );

	for( var i = 0; i < this.faces.length; ++i )
	{
		points = this.faces[ i ];
		for( var j = 0; j < points.length; ++j )
		{
			points[ j ].sub( center ).multiplyScalar( scale );
		}
	}

	for( var i = 0; i < this.pictures.length; ++i )
	{
		var picture = this.pictures[ i ];
		var mid = 0.5 * ( picture.start + picture.end );
		
		picture.start = mid + ( picture.start - mid ) / scale;
		picture.end   = mid + ( picture.end   - mid ) / scale;
	}
},

onDragStart: function()
{
},

onDragStop: function()
{
	graphics.overview.mouseDragStop();
},

onDragMove: function()
{
	graphics.overview.mouseDrag( Dragging.delta );
},

}
