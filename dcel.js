function DCEL()
{
	this.edges = new Array();
	this.vertices = new Array();
	this.faces = new Array();
}

DCEL.prototype.fromVectorList = function( vectors )
{
	function checkIfCCW( poly )
	{
		var origin = poly[ 0 ].clone().add( poly[ 1 ] ).multiplyScalar( 0.5 );
		var normal = lineNormal( poly[ 0 ], poly[ 1 ] );
		var target = origin.clone().add( normal );

		var intersectedSegments = 0;
		for( var i = 2; i < poly.length; ++i )
		{
			var xintersect = extendedLineIntersection(
				origin, target, poly[ i - 1 ], poly[ i ] );

			if( xintersect != null &&
				xintersect[ 2 ] >= 0.0 && xintersect[ 2 ] <= 1.0 &&
				xintersect[ 0 ].sub( origin ).dot( normal ) > 0.0 )
			{
				++intersectedSegments;
			}
		}

		var xintersect = extendedLineIntersection(
			origin, target, poly[ poly.length - 1 ], poly[ 0 ] );

		if( xintersect != null &&
			xintersect[ 2 ] >= 0.0 && xintersect[ 2 ] <= 1.0 &&
			xintersect[ 0 ].sub( origin ).dot( normal ) > 0.0 )
		{
			++intersectedSegments;
		}

		return ( intersectedSegments % 2 == 1 );
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

	if( !checkIfCCW( vectors ) )
	{
		vectors.reverse();
	}

	var root = new HalfEdge();
	var face = new Face( root );
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

Face.prototype.area = function()
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

Face.prototype.contains = function( point )
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
		var intersection = extendedLineIntersection(
			point, target, iter.origin.pos, iter.next.origin.pos );
		if( intersection[ 1 ] >= 0.0 &&
			intersection[ 2 ] >= 0.0 && intersection[ 2 ] <= 1.0 )
		{
			++intersections;
		}

		iter = iter.next;
	} while( iter != this.edge );

	return ( intersections % 2 != 0 );
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
