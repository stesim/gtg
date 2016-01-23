function DCEL()
{
	this.edges = new Array();
	this.vertices = new Array();
	this.faces = new Array();
}

DCEL.prototype.ACCEPT = 0;
DCEL.prototype.CCW = 1;
DCEL.prototype.CW = 2;

DCEL.prototype.simpleFromVectorList = function( vectors, order )
{
	function checkIfCCW( poly )
	{
		return ( pointListArea( poly ) > 0 );
	}

	this.edges.length = 0;
	this.vertices.length = 0;
	this.faces.length = 0;

	if( vectors.length === 1 )
	{
		this.vertices.push( new Vertex( null, vectors[ 0 ] ) );
		return this;
	}
	else if( vectors.length < 3 )
	{
		return this;
	}

	if( order && order !== DCEL.prototype.ACCEPT )
	{
		var isCCW = checkIfCCW( vectors );
		if( ( order === DCEL.prototype.CCW && !isCCW ) ||
			( order === DCEL.prototype.CW && isCCW ) )
		{
			vectors.reverse();
		}
	}

	var root = new HalfEdge();
	var face = new Face( root );
	face.tag = true;

	root.origin = new Vertex( root, vectors[ 0 ] );
	root.face = face;
	root.tag = 0; // TODO: remove

	this.edges.push( root );
	this.faces.push( face );
	this.vertices.push( root.origin );

	var previous = root;
	for( var i = 1; i < vectors.length; ++i )
	{
		var current = new HalfEdge();
		this.edges.push( current );
		current.prev = previous;

		current.origin = new Vertex( current, vectors[ i ] );
		this.vertices.push( current.origin );
		current.face = face;

		current.tag = i; // TODO: remove

		previous.next = current;

		previous = current;
	}

	previous.next = root;
	root.prev = previous;

	return this;
}

DCEL.prototype.fromVectorList = function( polygon, holes, forceOrderCheck )
{
	var order = ( forceOrderCheck ?
		DCEL.prototype.CCW : DCEL.prototype.ACCEPT );

	this.simpleFromVectorList( polygon, order );

	if( holes )
	{
		for( var i = 0; i < holes.length; ++i )
		{
			this.addHole( this.faces[ 0 ], holes[ i ], forceOrderCheck );
		}
	}

	return this;
}

DCEL.prototype.addHole = function( face, points, forceOrderCheck )
{
	var order = ( forceOrderCheck ? DCEL.prototype.CW : DCEL.prototype.ACCEPT );
	var hole = new DCEL().simpleFromVectorList( points, order );
	for( var j = 0; j < hole.edges.length; ++j )
	{
		var edge = hole.edges[ j ];
		edge.face = face;
		edge.twin = new HalfEdge();

		this.vertices.push( edge.origin );
		this.edges.push( edge );
	}
	for( var j = 0; j < hole.edges.length; ++j )
	{
		var edge = hole.edges[ j ];
		edge.twin.face = hole.faces[ 0 ];
		edge.twin.origin = edge.next.origin;
		edge.twin.next = edge.prev.twin;
		edge.twin.prev = edge.next.twin;
		edge.twin.twin = edge;

		this.edges.push( edge.twin );
	}
	hole.faces[ 0 ].edge = hole.edges[ 0 ].twin;
	hole.faces[ 0 ].tag = false;
	this.faces.push( hole.faces[ 0 ] );
}

DCEL.prototype.addDisjointFace = function( points, forceOrderCheck )
{
	var order = ( forceOrderCheck ? DCEL.prototype.CCW : DCEL.prototype.ACCEPT );
	var face = new DCEL().simpleFromVectorList( points, order );
	for( var j = 0; j < face.edges.length; ++j )
	{
		var edge = face.edges[ j ];

		this.vertices.push( edge.origin );
		this.edges.push( edge );
	}
	face.faces[ 0 ].tag = true;
	this.faces.push( face.faces[ 0 ] );
}

DCEL.prototype.addFace = function( points )
{
	var isHole = ( pointListArea( points ) < 0 );
	if( !isHole )
	{
		this.addDisjointFace( points );
	}
	else
	{
		for( var i = 0; i < this.faces.length; ++i )
		{
			if( this.isPointInFace( points[ 0 ], this.faces[ i ] ) )
			{
				this.addHole( this.faces[ i ], points );
				break;
			}
		}
	}
}

DCEL.prototype.clearTemp = function()
{
	for( var i = 0; i < this.edges.length; ++i )
	{
		this.edges[ i ].temp = null;
	}
	for( var i = 0; i < this.vertices.length; ++i )
	{
		this.vertices[ i ].temp = null;
	}
	for( var i = 0; i < this.faces.length; ++i )
	{
		this.faces[ i ].temp = null;
	}
}

DCEL.prototype.isPointInFace = function( point, face )
{
	var angle = Math.random() * 2 * Math.PI;
	var target =
		new THREE.Vector2( Math.cos( angle ), Math.sin( angle ) ).add( point );

	var intersections = 0;
	for( var i = 0; i < this.edges.length; ++i )
	{
		var edge = this.edges[ i ];
		if( edge.face === face )
		{
			var intersection = halfLineEdgeIntersection( point, target, edge );
			if( intersection !== null )
			{
				++intersections;
			}
		}
	}
	return ( ( intersections % 2 ) !== 0 );
}

DCEL.prototype.faceArea = function( face )
{
	// efficient simple polygon area computation, cf.:
	//   http://geomalgorithms.com/a01-_area.html#2D%20Polygons

	var A = 0;
	for( var i = 0; i < this.edges.length; ++i )
	{
		var edge = this.edges[ i ];
		if( edge.face === face )
		{
			A += edge.origin.pos.x *
				( edge.next.origin.pos.y - edge.prev.origin.pos.y );
		}
	}
	return ( 0.5 * A );
}

DCEL.prototype.removeVertex = function( v )
{
	v.edge.prev.next = v.edge.next;
	v.edge.next.prev = v.edge.prev;

	if( v.edge.face.edge === v.edge )
	{
		v.edge.face.edge = v.edge.next;
	}

	this.edges.splice( this.edges.indexOf( v.edge ), 1 );
	this.vertices.splice( this.vertices.indexOf( v ), 1 );
}

function Vertex( e, pos )
{
	this.edge = e;
	this.pos = pos;

	this.tag = null;
	this.temp = null;
}

Vertex.prototype.findEdgeOnFace = function( face )
{
	var INITIAL = this.edge;
	var iter = INITIAL;
	do
	{
		if( iter.face === face )
		{
			return iter;
		}

		iter = ( iter.twin !== null ? iter.twin.next : null );
	} while( iter !== null && iter !== INITIAL );

	return null;
}

Vertex.prototype.isConvex = function()
{
	return ( this.edge.direction().dot( this.edge.prev.normal() ) > 0 );
}

Vertex.prototype.isCollinear = function()
{
	return ( Math.abs( cross2D( this.edge.prev.vector(), this.edge.vector() ) ) < eps );
}

function Face( e )
{
	this.edge = e;

	this.tag = null;
	this.temp = null;
}

Face.prototype.insertDiagonal = function( v1, v2 )
{
	var e1 = v1.findEdgeOnFace( this );
	var e2 = v2.findEdgeOnFace( this );

	var new1 = new HalfEdge();
	new1.prev = e1.prev;
	new1.next = e2;
	new1.origin = v1;
	new1.face = e1.face;
	new1.face.edge = new1;

	var new2 = new HalfEdge();
	new2.prev = e2.prev;
	new2.next = e1;
	new2.origin = v2;
	new2.face = new Face( new2 );
	
	new1.twin = new2;
	new2.twin = new1;

	e1.prev.next = new1;
	e1.prev = new2;

	e2.prev.next = new2;
	e2.prev = new1;

	var iter = new1.next;
	while( iter != new1 )
	{
		iter.face = new1.face;
		iter = iter.next;
	}
}

Face.prototype.extractVertices = function()
{
	var vertices = new Array();
	var iter = this.edge;
	do
	{
		vertices.push( iter.origin );
		iter = iter.next;
	} while( iter !== this.edge );
	return vertices;
}

Face.prototype.boundaryArea = function()
{
	// efficient simple polygon area computation, cf.:
	//   http://geomalgorithms.com/a01-_area.html#2D%20Polygons

	var A = 0;
	var iter = this.edge;
	do
	{
		A += iter.origin.pos.x *
			( iter.next.origin.pos.y - iter.prev.origin.pos.y );

		iter = iter.next;
	} while( iter != this.edge );

	return ( 0.5 * A );
}

Face.prototype.boundaryContains = function( point )
{
	var dir = new THREE.Vector2( 0, 0 );
	while( Math.abs( dir.x ) + Math.abs( dir.y ) < 0.1 )
	{
		dir.x = Math.random();
		dir.y = Math.random();
	}
	dir.add( point );
	var target = dir;

	var intersections = 0;
	var iter = this.edge;
	do
	{
		var intersection = halfLineEdgeIntersection( point, target, iter );
		if( intersection !== null )
		{
			++intersections;
		}

		iter = iter.next;
	} while( iter !== this.edge );

	return ( ( intersections % 2 ) !== 0 );
}

function HalfEdge()
{
	this.prev = null;
	this.next = null;
	this.twin = null;

	this.origin = null;
	this.face = null;

	this.tag = null;
	this.temp = null;
}

HalfEdge.prototype.vector = function()
{
	return this.next.origin.pos.clone().sub( this.origin.pos );
}

HalfEdge.prototype.direction = function()
{
	return this.vector().normalize();
}

HalfEdge.prototype.normal = function()
{
	var normal = this.direction();
	normal.set( -normal.y, normal.x );
	return normal;
}

HalfEdge.prototype.lerp = function( t )
{
	return new THREE.Vector2().lerpVectors(
		this.origin.pos, this.next.origin.pos, t );
}

HalfEdge.prototype.length = function()
{
	if( this.next == null || this.next.origin == null )
	{
		return null;
	}

	return this.origin.pos.distanceTo( this.next.origin.pos );
}

HalfEdge.prototype.pointDistance = function( p )
{
	return this.normal().dot( p.clone().sub( this.origin.pos ) );
}

HalfEdge.prototype.pointProjection = function( p )
{
	var op = p.clone().sub( this.origin.pos );
	var vec = this.vector();
	var proj = vec.dot( op ) / vec.lengthSq();

	var distance;
	if( proj < eps )
	{
		distance = this.origin.pos.distanceTo( p );
	}
	else if( proj > ( 1 - eps ) )
	{
		distance = this.next.origin.pos.distanceTo( p );
	}
	else
	{
		distance = Math.abs( this.normal().dot( op ) );
	}
	return { localCoordinate: proj, distance: distance };
}
