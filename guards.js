function GuardType( name, cost, visibilityFunction, previewMesh,
	enterFirstPerson, exitFirstPerson )
{
	this.name = name;
	this.cost = cost;
	this.visibility = visibilityFunction;
	this.previewMesh = previewMesh;
	this.enterFirstPerson = enterFirstPerson;
	this.exitFirstPerson = exitFirstPerson;
}

GuardType.prototype.create = function( position, polygon )
{
	return new Guard( this, position, polygon );
}

var GuardTypes =
[
	new GuardType(
		"360° Camera",
		800,
		function( dcel, guard )
		{
			return visibility( dcel, guard.position );
		},
		graphics.createGuardPreview( 0, 2 * Math.PI ) ),

	new GuardType(
		"180° Camera",
		400,
		function( dcel, guard )
		{
			return visibility(
				dcel,
				guard.position,
				{
					direction: guard.direction,
					minAngle: -0.5 * Math.PI,
					maxAngle: 0.5 * Math.PI
				} );
		},
		graphics.createGuardPreview( -0.5 * Math.PI, 0.5 * Math.PI ) ),

	new GuardType(
		"90° Camera",
		200,
		function( dcel, guard )
		{
			return visibility(
				dcel,
				guard.position,
				{
					direction: guard.direction,
					minAngle: -0.25 * Math.PI,
					maxAngle: 0.25 * Math.PI
				} );
		},
		graphics.createGuardPreview( -0.25 * Math.PI, 0.25 * Math.PI ),
		function()
		{
			graphics.setFxHorizontalFOV( 0.5 * Math.PI );
		},
		function()
		{
			graphics.resetFxFOV();
		} ),
]

function Guard( type, position, polygon )
{
	this.type = type;
	this.position = position;
	this.direction = 0.5 * Math.PI;
	this.polygon = null;
	this.cameraMesh = null;
	this.visibilityMesh = null;
	this.color = null;

	this.init( polygon );
}

Guard.prototype.init = function( polygon )
{
	this.color = Math.floor( 0xffffff * Math.random() );

	this.guardMesh = new THREE.Mesh(
		new THREE.SphereGeometry( 12, 8, 8 ),
		new THREE.MeshBasicMaterial( { color: this.color } ) );
	graphics.levelMeshes.add( this.guardMesh );

	this.move( this.position, polygon );
}

Guard.prototype.move = function( position, polygon )
{
	if( this.visibilityMesh !== null )
	{
		graphics.visibilityMeshes.remove( this.visibilityMesh );
	}

	this.position = position;

	this.guardMesh.position.set( position.x, position.y, 0 );
	this.guardMesh.rotation.z = this.direction;

	this.polygon = this.type.visibility( polygon, this );

	this.visibilityMesh = graphics.createPolygonMesh(
		this.polygon, graphics.visibilityMaterial, this.color );
	if( this.visibilityMesh !== null )
	{
		this.visibilityMesh.position.z = 0.1;
		graphics.visibilityMeshes.add( this.visibilityMesh );
	}
}

Guard.prototype.rotate = function( direction, polygon )
{
	console.log( direction );
	this.direction = direction;
	this.guardMesh.rotation.z = direction;
	this.move( this.position, polygon );
}

Guard.prototype.removeMeshes = function()
{
	graphics.levelMeshes.remove( this.guardMesh );
	if( this.visibilityMesh !== null )
	{
		graphics.visibilityMeshes.remove( this.visibilityMesh );
	}
}
