function GuardType( name, cost, visibilityFunction )
{
	this.name = name;
	this.cost = cost;
	this.visibility = visibilityFunction;
}

GuardType.prototype.create = function( position, polygon )
{
	return new Guard( this, position, polygon );
}

var GuardTypes =
[
	new GuardType( "360° Camera", 800, visibility ),
	new GuardType( "180° Camera", 400, visibility ),
	new GuardType( "90° Camera", 200, visibility )
]

function Guard( type, position, polygon )
{
	this.type = type;
	this.position = position;
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

	this.move( this.position, polygon );
}

Guard.prototype.move = function( position, polygon )
{
	this.position = position;

	this.guardMesh.position.set( position.x, position.y, 0 );

	this.polygon = this.type.visibility( polygon, this.position );

	this.visibilityMesh = graphics.createPolygonMesh(
		this.polygon, graphics.visibilityMaterial, this.color );
	this.visibilityMesh.position.z = 0.1;
}
