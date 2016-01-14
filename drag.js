var Dragging =
{
	active: false,
	effective: false,
	start: new THREE.Vector2(),
	last: new THREE.Vector2(),
	delta: new THREE.Vector2(),
	mouseUpHandler: null,
	mouseMoveHandler: null,

	onstart: null,
	onmove: null,
	onstop: null,

	init: function()
	{
		graphics.renderer.domElement.addEventListener(
			"mousedown", this.onMouseDown.bind( this ), false );

		mouseUpHandler = this.onMouseUp.bind( this );
		mouseMoveHandler = this.onMouseMove.bind( this );
	},

	onMouseDown: function( event )
	{
		this.active = true;
		this.effective = false;
		this.start = graphics.mouseEventCoord( event );
		this.last.copy( this.start );
		this.delta.set( 0, 0 );

		document.addEventListener( "mousemove", mouseMoveHandler, false );
		document.addEventListener( "mouseup", mouseUpHandler, false );
	},

	onMouseUp: function( event )
	{
		document.removeEventListener( "mousemove", mouseMoveHandler, false );
		document.removeEventListener( "mouseup", mouseUpHandler, false );

		this.active = false;

		if( this.onstop && this.effective )
		{
			this.onstop();
		}
	},

	onMouseMove: function( event )
	{
		this.last = graphics.mouseEventCoord( event, this.last );
		this.delta.copy( this.last ).sub( this.start );

		if( !this.effective )
		{
			this.effective = true;
			if( this.onstart )
			{
				this.onstart();
			}
		}

		if( this.onmove )
		{
			this.onmove();
		}
	},
};
