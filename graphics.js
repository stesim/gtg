var graphics =
{
	WIDTH: undefined,
	HEIGHT: undefined,

	scene: null,
	renderer: null,
	renderingEnabled: true,
	updateFunc: null,

	topView:
	{
		background: new THREE.Color().setRGB( 0.5, 0.5, 0.5 ),
		camera: new THREE.OrthographicCamera( -100, 100, 100, -100, 0.1, 20000 ),
		update: function()
		{
			var g = graphics;

			this.camera.left   = -this.viewport.width  * graphics.WIDTH  / 2 * g.topViewZoom;
			this.camera.right  =  this.viewport.width  * graphics.WIDTH  / 2 * g.topViewZoom;
			this.camera.top    =  this.viewport.height * graphics.HEIGHT / 2 * g.topViewZoom;
			this.camera.bottom = -this.viewport.height * graphics.HEIGHT / 2 * g.topViewZoom;

			this.camera.updateProjectionMatrix();
		},
		viewport:
		{
			x: 0.01,
			y: 0.01,
			width: 0.25,
			height: 0.25,
			absolute: false
		},
	},
	fxView:
	{
		background: new THREE.Color().setRGB( 0.1, 0.1, 0.1 ),
		camera: new THREE.PerspectiveCamera( 90, 200 / 200, 0.1, 5000 ),
		update: function()
		{
			this.camera.aspect = ( this.viewport.width * graphics.WIDTH ) /
			                     ( this.viewport.height * graphics.HEIGHT );
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
	},

	topViewZoom: 6.0,

	overview: null,

	wallMaterial: null,
	floorMaterial: null,
	visbilityMaterial: null,
	numPictures: 38,
	loadedPictures: 0,
	onTexturesLoaded: null,
	pictureMaterials: new Array(),
	lookDirArrow: null,
	levelMeshes: null,
	visibilityMeshes: null,
	hideVisibilityInFxView: false,
	topViewMeshes: null,

	init: function( updateFunc )
	{
		graphics.WIDTH = window.innerWidth;
		graphics.HEIGHT = window.innerHeight;

		graphics.updateFunc = updateFunc;

		graphics.scene = new THREE.Scene();

		graphics.renderer = new THREE.WebGLRenderer( { antialias: true } );
		graphics.renderer.enableScissorTest( true );
		graphics.renderer.setSize( graphics.WIDTH, graphics.HEIGHT );

		document.body.appendChild( graphics.renderer.domElement );

		graphics.topViewZoom = Math.max(
			1.0 / graphics.topView.viewport.width,
			1.0 / graphics.topView.viewport.height ) + 1;

		graphics.fxView.update();
		graphics.scene.add( graphics.fxView.camera );

		graphics.overview = new OverviewController( graphics.fxView.camera );

		graphics.topView.camera.position.set( 0, 0, 500 );
		graphics.topView.camera.up.set( 0, 1, 0 );
		graphics.topView.camera.lookAt( graphics.scene.position );
		graphics.topView.update();
		graphics.scene.add( graphics.topView.camera );

		window.addEventListener( 'resize', function() {
			graphics.WIDTH = window.innerWidth;
			graphics.HEIGHT = window.innerHeight;
			graphics.renderer.setSize( graphics.WIDTH, graphics.HEIGHT );

			graphics.topViewZoom = Math.max(
				1.0 / graphics.topView.viewport.width,
				1.0 / graphics.topView.viewport.height ) + 1;

			graphics.fxView.update();
			graphics.topView.update();
		} );

		var light = new THREE.PointLight( 0xaaaaaa );
		light.position.set( 0, 0, 500 );
		graphics.scene.add( light );

		var ambientLight = new THREE.AmbientLight( 0xccccff );
		graphics.scene.add( ambientLight );

		graphics.wallMaterial =
			new THREE.MeshPhongMaterial( {
				color: 0x333333,
				specular: 0xffffff,
				shininess: 5,
				side: THREE.DoubleSide,
			} );

		graphics.floorMaterial = graphics.wallMaterial;

		graphics.levelMeshes = new THREE.Object3D();
		graphics.scene.add( graphics.levelMeshes );

		graphics.visibilityMeshes = new THREE.Object3D();
		graphics.scene.add( graphics.visibilityMeshes );

		graphics.topViewMeshes = new THREE.Object3D();
		graphics.scene.add( graphics.topViewMeshes );

		graphics.visibilityMaterial = new THREE.MeshBasicMaterial(
			{ vertexColors: THREE.FaceColors } );
		graphics.visibilityMaterial.transparent = true;
		graphics.visibilityMaterial.opacity = 0.2;
		graphics.visibilityMaterial.needsUpdate = true;

		graphics.lookDirArrow = new THREE.ArrowHelper(
			new THREE.Vector3( 0, 0, -1 ),
			new THREE.Vector3( 0, 100, 0 ),
			50,
			0xffffff,
			30,
			20 );
		graphics.lookDirArrow.visible = false;
		graphics.fxView.camera.add( graphics.lookDirArrow );

		var textureLoader = new THREE.TextureLoader();
		
		var onLoadTexture = function( index, texture )
		{
			if( ++graphics.loadedPictures >= graphics.numPictures &&
				graphics.onTexturesLoaded )
			{
				graphics.onTexturesLoaded();
			}
		}

		var zeros = "0000";
		for( var i = 0; i < graphics.numPictures; ++i )
		{
			var numStr = i.toString();
			var file =
				"pictures/" + zeros.substr( numStr.length ) + numStr + ".jpg";

			var texture = textureLoader.load( file,
				onLoadTexture.bind( graphics, i ) );
			graphics.pictureMaterials.push(
				new THREE.MeshPhongMaterial( { map: texture } ) );

			texture.generateMipmaps = false;
			texture.minFilter = THREE.LinearFilter;
			texture.magFilter = THREE.LinearFilter;
		}
	},

	enableRendering: function()
	{
		graphics.renderer.domElement.style.visibility = "visible";
		graphics.renderingEnabled = true;
	},

	disableRendering: function()
	{
		graphics.renderer.domElement.style.visibility = "hidden";
		graphics.renderingEnabled = false;
	},

	setFxHorizontalFOV: function( hfov )
	{
		hfov = Math.min( hfov, Math.PI );
		var aspect = graphics.fxView.camera.aspect;
		var vfov = 2 * Math.atan( Math.tan( 0.5 * hfov ) / aspect );
		graphics.fxView.camera.fov = vfov * 180 / Math.PI;
		graphics.fxView.camera.updateProjectionMatrix();
	},

	resetFxFOV: function()
	{
		graphics.fxView.camera.fov = 90;
		graphics.fxView.camera.updateProjectionMatrix();
	},

	render: function()
	{
		if( graphics.updateFunc !== null )
		{
			graphics.updateFunc();
		}

		if( graphics.renderingEnabled )
		{
			//stats.begin();

			if( graphics.hideVisibilityInFxView )
			{
				graphics.visibilityMeshes.visible = false;
			}
			graphics.topViewMeshes.visible = false;
			graphics.setView( graphics.fxView );
			graphics.renderer.render( graphics.scene, graphics.fxView.camera );

			graphics.visibilityMeshes.visible = true;
			graphics.topViewMeshes.visible = true;
			graphics.setView( graphics.topView );
			graphics.renderer.render( graphics.scene, graphics.topView.camera );

			//stats.end();
		}

		requestAnimationFrame( graphics.render );
	},

	setView: function( view )
	{
		var x = view.viewport.x;
		var y = view.viewport.y;
		var width = view.viewport.width;
		var height = view.viewport.height;
		if( !view.viewport.absolute )
		{
			x *= graphics.WIDTH;
			y *= graphics.HEIGHT;
			width  *= graphics.WIDTH;
			height *= graphics.HEIGHT;
		}

		graphics.renderer.setViewport( x, y, width, height );
		graphics.renderer.setScissor( x, y, width, height );
		graphics.renderer.setClearColor( view.background );
	},

	projectPointToViewport: function( viewport, coord )
	{
		var p = coord.clone();
		if( !viewport.absolute )
		{
			p.divide( new THREE.Vector2( graphics.WIDTH, graphics.HEIGHT ) );
		}
		p.sub( new THREE.Vector2( viewport.x, viewport.y ) )
		 .divide( new THREE.Vector2( viewport.width, viewport.height ) );

		if( p.x >= 0.0 && p.x <= 1.0 && p.y >= 0.0 && p.y <= 1.0 )
		{
			return p;
		}
		else
		{
			return null;
		}
	},

	screenToWorldPosition: function( coord )
	{
		var p =
			graphics.projectPointToViewport( graphics.topView.viewport, coord );
		if( p !== null )
		{
			p.addScalar( -0.5 )
			 .multiply( new THREE.Vector2( graphics.topView.viewport.width  * graphics.WIDTH,
										   graphics.topView.viewport.height * graphics.HEIGHT ) )
			 .multiplyScalar( graphics.topViewZoom );
		}
		else
		{
			p = graphics.projectPointToViewport(
				graphics.fxView.viewport, coord );
			if( p !== null )
			{
				var p3 = new THREE.Vector3( 2 * p.x - 1, 2 * p.y - 1, 0.0 );
				p3.unproject( graphics.fxView.camera );
				var n = p3.clone()
					.sub( graphics.fxView.camera.position ).normalize();
				p3.addScaledVector( n, -p3.z / n.z );
				p.set( p3.x, p3.y );
			}
			else
			{
				return null;
			}
		}

		return p;
	},

	clearLevelMeshes: function()
	{
		graphics.scene.remove( graphics.levelMeshes );
		graphics.levelMeshes = new THREE.Object3D();
		graphics.scene.add( graphics.levelMeshes );

		graphics.scene.remove( graphics.visibilityMeshes );
		graphics.visibilityMeshes = new THREE.Object3D();
		graphics.scene.add( graphics.visibilityMeshes );
	},

	createWallMesh: function( start, end )
	{
		var diff = end.clone().sub( start );
		var center = new THREE.Vector3().lerpVectors( start, end, 0.5 );
		var length = diff.length();

		var wall = new THREE.Mesh(
			new THREE.PlaneGeometry( length, WALLHEIGHT ),
			graphics.wallMaterial );
		wall.rotation.order = "ZXY";
		wall.rotation.set( Math.PI / 2, 0, Math.atan2( diff.y, diff.x ) );
		wall.position.set( center.x, center.y, WALLHEIGHT / 2 );

		return wall;
	},

	createPillarMesh: function( pos )
	{
		var pillar = new THREE.Mesh(
			new THREE.CylinderGeometry(
				WALLWIDTH / 2,
				WALLWIDTH / 2,
				PILLARHEIGHT,
				16,
				1 ),
			graphics.wallMaterial );
		pillar.rotation.set( Math.PI / 2, 0, 0 );
		pillar.position.set( pos.x, pos.y, PILLARHEIGHT / 2 );

		return pillar;
	},

	createPictureMesh: function( id, pos, dir, size )
	{
		var material = graphics.pictureMaterials[ id ];
		var invAspect = material.map.image.height / material.map.image.width;

		var mesh = new THREE.Mesh(
			new THREE.PlaneGeometry( size, size * invAspect ),
			material );

		mesh.position.set(
			pos.x + 0.5 * dir.x,
			pos.y + 0.5 * dir.y,
			0.5 * WALLHEIGHT );
		mesh.up.set( 0, 0, 1 );
		mesh.lookAt( new THREE.Vector3(
			mesh.position.x + dir.x,
			mesh.position.y + dir.y,
			mesh.position.z ) );

		return mesh;
	},

	createPolygonMesh: function( dcel, material, color )
	{
		if( dcel.faces.length <= 0 )
		{
			return null;
		}

		var shape = new THREE.Shape();
		shape.moveTo( dcel.edges[ 0 ].origin.pos.x, dcel.edges[ 0 ].origin.pos.y );

		var iter = dcel.edges[ 0 ].next;
		while( iter !== dcel.edges[ 0 ] )
		{
			shape.lineTo( iter.origin.pos.x, iter.origin.pos.y );

			iter = iter.next;
		}

		for( var i = 1; i < dcel.faces.length; ++i )
		{
			var hole = new THREE.Path();
			var start = dcel.faces[ i ].edge.twin;
			var iter = start;
			hole.moveTo( iter.origin.pos.x, iter.origin.pos.y );
			iter = iter.next;

			while( iter !== start )
			{
				hole.lineTo( iter.origin.pos.x, iter.origin.pos.y );
				iter = iter.next;
			}

			shape.holes.push( hole );
		}

		var geom = shape.makeGeometry();

		if( color )
		{
			for( var i = 0; i < geom.faces.length; ++i )
			{
				geom.faces[ i ].color.setHex( color );
			}
		}

		return new THREE.Mesh( geom, material );
	},

	createLevelMeshes: function( dcel )
	{
		var container = new THREE.Object3D();

		for( var i = 0; i < dcel.faces.length; ++i )
		{
			var start = dcel.faces[ i ].edge;
			if( i > 0 )
			{
				start = start.twin;
			}
			var iter = start;
			do
			{
				container.add( graphics.createWallMesh(
					iter.prev.origin.pos, iter.origin.pos ) );
				iter = iter.next;
			} while( iter !== start );
		}

		var floorMesh = graphics.createPolygonMesh(
			dcel, graphics.floorMaterial );
		container.add( floorMesh );

		return container;
	},

	createGuardPreview: function( minAngle, maxAngle )
	{
		var SIZE = 3000;
		var ZPOSITION = 10;

		var geom;
		if( minAngle <= 0 && maxAngle >= 2 * Math.PI )
		{
			geom = new THREE.PlaneGeometry( SIZE, SIZE );
		}
		else
		{
			geom = new THREE.CircleGeometry(
				SIZE, 4, minAngle, maxAngle - minAngle );
		}
		geom.translate( 0, 0, ZPOSITION );
		geom.rotateX( -0.5 * Math.PI );

		return new THREE.Mesh( geom );
	},

	mouseEventCoord: function( event, coord )
	{
		if( coord )
		{
			return coord.set( event.clientX, graphics.HEIGHT - event.clientY );
		}
		else
		{
			return new THREE.Vector2(
				event.clientX, graphics.HEIGHT - event.clientY );
		}
	},
}
