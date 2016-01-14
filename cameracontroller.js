function OverviewController( camera )
{
	this.camera = camera;
	this.active = false;
	this.lastPosition = new THREE.Vector3();

	this.reset();
}

OverviewController.prototype.activate = function()
{
	this.active = true;

	this.correctCameraTransform();
}

OverviewController.prototype.deactivate = function()
{
	this.active = false;
}

OverviewController.prototype.reset = function()
{
	this.lastPosition.set( 0, 0, 700 );

	this.correctCameraTransform();
}

OverviewController.prototype.correctCameraTransform = function()
{
	if( this.active )
	{
		graphics.fxView.camera.up.set( 0, 1, 0 );
		graphics.fxView.camera.rotation.set( 0, 0, 0 );
		this.camera.position.copy( this.lastPosition );
	}
}

OverviewController.prototype.mouseDrag = function( delta )
{
	if( this.active )
	{
		this.camera.position.x = ( this.lastPosition.x - delta.x );
		this.camera.position.y = ( this.lastPosition.y - delta.y );
	}
}

OverviewController.prototype.mouseDragStop = function()
{
	if( this.active )
	{
		this.lastPosition.copy( this.camera.position );
	}
}

OverviewController.prototype.mouseScroll = function( delta )
{
	if( this.active )
	{
		this.camera.position.z = clamp(
			this.camera.position.z - delta * 50, 50, 2000 );
		this.lastPosition.z = this.camera.position.z;
	}
}
