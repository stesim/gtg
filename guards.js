function GuardType( name, cost, visibilityFunction,
	enterFirstPerson, exitFirstPerson )
{
	this.name = name;
	this.cost = cost;
	this.visibility = visibilityFunction;
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
		} ),
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
		} ),
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
		} ),
]

function Guard( type, position, polygon )
{
	this.type = type;
	this.position = position;
	this.direction = 0;
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
		new THREE.SphereGeometry( 12, 16, 16 ),
		new THREE.MeshBasicMaterial( { color: this.color } ) );
	graphics.levelMeshes.add( this.guardMesh );

	this.move( this.position, polygon );
}

Guard.prototype.move = function( position, polygon )
{
	if( this.visibilityMesh !== null )
	{
		graphics.levelMeshes.remove( this.visibilityMesh );
	}

	this.position = position;

	this.guardMesh.position.set( position.x, position.y, 0 );

	this.polygon = this.type.visibility( polygon, this );

	this.visibilityMesh = graphics.createPolygonMesh(
		this.polygon, graphics.visibilityMaterial, this.color );
	if( this.visibilityMesh !== null )
	{
		this.visibilityMesh.position.z = 0.1;
		graphics.levelMeshes.add( this.visibilityMesh );
	}
}

Guard.prototype.removeMeshes = function()
{
	graphics.levelMeshes.remove( this.guardMesh );
	if( this.visibilityMesh !== null )
	{
		graphics.levelMeshes.remove( this.visibilityMesh );
	}
}
