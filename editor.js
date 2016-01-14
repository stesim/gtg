var LevelEditor =
{

NORMALIZATION_SIZE: 1000,
PICTUREOFFSETMIN: 30,
PICTUREOFFSETMAX: 150,

geometryFinished: false,
picturesFinished: false,
points: new Array(),
dcel: null,
pictures: new Array(),
pictureMeshes: new Array(),
helperMesh: new THREE.Mesh(
	new THREE.SphereGeometry( 12, 16, 16 ),
	new THREE.MeshBasicMaterial( { color: 0xff0000 } ) ),
mouseUpHandler: null,

selectedID: 0,
currentPictureSize: 50,

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
	this.helperMesh.visible = false;

	this.mouseUpHandler = this.onMouseUp.bind( this );

	this.UI.quit.onclick = function() { GameState.set( GameStates.Menu ); };
	this.UI.newLevel.onclick = this.reset.bind( this );
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

		graphics.clearLevelMeshes();
		graphics.levelMeshes.add( this.helperMesh );

		this.addGeometryMeshes();
		this.finalizeGeometry();
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
	this.geometryFinished = false;
	this.picturesFinished = false;
	this.points.length = 0;
	this.dcel = null;
	this.pictures.length = 0;
	this.pictureMeshes.length = 0;

	this.helperMesh.visible = false;

	if( initial !== undefined && initial )
	{
		graphics.clearLevelMeshes();
		graphics.levelMeshes.add( this.helperMesh );

		graphics.overview.reset();
	}

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
	graphics.levelMeshes.add( this.helperMesh );

	graphics.overview.activate();
	Dragging.onstart = this.onDragStart.bind( this );
	Dragging.onmove = this.onDragMove.bind( this );
	Dragging.onstop = this.onDragStop.bind( this );

	UI.show( this.UI.title );

	UI.show( this.UI.menu );

	graphics.renderer.domElement.
		addEventListener( "mouseup", this.mouseUpHandler, false );
},

onExit: function()
{
	this.reset();

	graphics.levelMeshes.remove( this.helperMesh );

	graphics.overview.deactivate();
	Dragging.onstart = null;
	Dragging.onmove = null;
	Dragging.onstop = null;

	UI.hide( this.UI.menu );

	UI.hide( this.UI.title );

	graphics.renderer.domElement.
		removeEventListener( "mouseup", this.mouseUpHandler, false );
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

		this.points.push( p );

		if( this.points.length > 1 )
		{
			graphics.levelMeshes.add( graphics.createWallMesh(
				this.points[ this.points.length - 2 ], p ) );
		}
		else
		{
			graphics.levelMeshes.add( graphics.createPillarMesh( p ) );
		}
	}
	else if( !this.picturesFinished )
	{
		var p = graphics.screenToWorldPosition( coord );
		if( p === null ) { return; }

		var closestEdge = findClosestDCELEdge( this.dcel, p );
		if( closestEdge.distance < 10 )
		{
			var halfLocalPicSize =
				0.5 * this.currentPictureSize / closestEdge.edge.length();

			this.addPicture(
				this.selectedID,
				this.dcel.edges.indexOf( closestEdge.edge ),
				closestEdge.localCoordinate - halfLocalPicSize,
				closestEdge.localCoordinate + halfLocalPicSize );
		}
	}
},

importGeometry: function( svg )
{
	this.reset();

	var points = this.parseSvg( svg );

	if( points !== null )
	{
		this.points = points;

		this.addGeometryMeshes();

		this.finalizeGeometry();
	}
},

finalizeGeometry: function()
{
	if( this.points.length > 2 )
	{
		graphics.levelMeshes.remove( graphics.levelMeshes.children[ 1 ] );
		graphics.levelMeshes.add( graphics.createWallMesh(
			this.points[ this.points.length - 1 ], this.points[ 0 ] ) );

		this.dcel = new DCEL().fromVectorList( this.points );

		graphics.levelMeshes.add(
			graphics.createPolygonMesh( this.dcel, graphics.floorMaterial ) );

		this.geometryFinished = true;

		UI.hide( this.UI.pickerWrapper );

		UI.show( this.UI.random );

		UI.show( this.UI.normalize );

		UI.setText( this.UI.title, "Place pictures" );
	}
},

finalizePictures: function()
{
	this.picturesFinished = true;

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
		this.finalizeGeometry();
	}
	else if( !this.picturesFinished )
	{
		this.finalizePictures();
	}
},

addGeometryMeshes: function()
{
	graphics.levelMeshes.add( graphics.createPillarMesh( this.points[ 0 ] ) );
	for( var i = 1; i < this.points.length; ++i )
	{
		graphics.levelMeshes.add( graphics.createWallMesh(
			this.points[ i - 1 ], this.points[ i ] ) );
	}
},

undoWall: function()
{
	if( this.points.length > 0 )
	{
		this.points.pop();
		graphics.levelMeshes.remove( graphics.levelMeshes.children[
			graphics.levelMeshes.children.length - 1 ] );
	}
},

undoPicture: function()
{
	if( this.pictures.length > 0 )
	{
		this.pictures.pop();
		graphics.levelMeshes.remove( this.pictureMeshes.pop() );
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

addPicture: function( id, edgeIndex, start, end )
{
	var edge = this.dcel.edges[ edgeIndex ];
	var pos = edge.lerp( 0.5 * ( start + end ) );

	var size = ( end - start ) * edge.length();

	var mesh = graphics.createPictureMesh( id, pos, edge.normal(), size );

	this.pictureMeshes.push( mesh );
	graphics.levelMeshes.add( mesh );

	this.pictures.push( new LevelEditor.Picture( id, edgeIndex, start, end ) );
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

	var scale = 0.5 + 0.5 * Math.random();
	var size = 0.5 * WALLHEIGHT * scale;

	var edgeIndex = 0;
	var iter = this.dcel.edges[ 0 ];
	do
	{
		var wallLength = iter.length();
		var pos = randOffset();

		while( wallLength >= pos + size + LevelEditor.PICTUREOFFSETMIN )
		{
			var id =
				Math.floor( Math.random() * graphics.pictureMaterials.length );

			this.addPicture(
				id,
				edgeIndex,
				pos / wallLength,
				( pos + size ) / wallLength );

			pos += size + randOffset();

			scale = 0.5 + 0.5 * Math.random();
			size = 0.5 * WALLHEIGHT * scale;
		}

		iter = iter.next;
		++edgeIndex;
	} while( iter != this.dcel.edges[ 0 ] );
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
		graphics.levelMeshes.add( mesh );

		this.pictureMeshes[ i ] = mesh;
	}
},

createExportLink: function()
{
	var points = new Array( this.points.length );
	for( var i = 0; i < this.points.length; ++i )
	{
		points[ i ] = [ this.points[ i ].x, this.points[ i ].y ];
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
		this.pictures,
		1 );

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
	if( this.points.length <= 0 ) { return; }

	var size = this.NORMALIZATION_SIZE;

	var xmin = this.points[ 0 ].x;
	var xmax = xmin;
	var ymin = this.points[ 0 ].y;
	var ymax = ymin;
	for( var i = 1; i < this.points.length; ++i )
	{
		var p = this.points[ i ];
		if( p.x < xmin )      { xmin = p.x; }
		else if( p.x > xmax ) { xmax = p.x; }

		if( p.y < ymin )      { ymin = p.y; }
		else if( p.y > ymax ) { ymax = p.y; }
	}

	var scale = Math.min( size / ( xmax - xmin ), size / ( ymax - ymin ) );
	var center = new THREE.Vector2(
		0.5 * ( xmax + xmin ),
		0.5 * ( ymax + ymin ) );

	for( var i = 0; i < this.points.length; ++i )
	{
		this.points[ i ].sub( center ).multiplyScalar( scale );
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
