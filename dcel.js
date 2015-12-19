function lineNormal( a, b )
{
	var r = b.clone().sub( a );
	r.set( -r.y, r.x );
	r.normalize();

	return r;
}

function linePointDistance( a, b, p )
{
	return p.clone().sub( a ).dot( lineNormal( a, b ) );
}

function cross2D( a, b )
{
	return a.x * b.y - a.y * b.x;
}

function extendedLineIntersection( a, b, p, q )
{
	var ab = b.clone().sub( a );
	var pq = q.clone().sub( p );
	var abxpq = cross2D( ab, pq );

	if( Math.abs( abxpq ) < 0.00001 )
	{
		return null;
	}

	var ap = p.clone().sub( a ).divideScalar( abxpq );
	var s = cross2D( ap, pq );
	var t = cross2D( ap, ab );

	return [ ab.multiplyScalar( s ).add( a ), s, t ];
}

function Vertex( e, pos )
{
	this.edge = e;
	this.pos = pos;
}

function Face( e )
{
	this.edge = e;
}

function HalfEdge()
{
	this.prev = null;
	this.next = null;
	this.twin = null;

	this.origin = null;
	this.face = null;
}

HalfEdge.prototype.direction = function()
{
	if( this.next == null || this.next.origin == null )
	{
		return null;
	}

	return this.next.origin.pos.clone().sub( this.origin.pos ).normalize();
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

function simplePolygonFromVectorList( vectors )
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

	if( vectors.length < 3 )
	{
		return null;
	}

	if( !checkIfCCW( vectors ) )
	{
		vectors.reverse();
	}

	var root = new HalfEdge();
	var face = new Face( root );
	root.origin = new Vertex( root, vectors[ 0 ] );
	root.face = face;

	var previous = root;
	for( var i = 1; i < vectors.length; ++i )
	{
		var current = new HalfEdge();
		current.prev = previous;

		current.origin = new Vertex( current, vectors[ i ] );
		current.face = face;

		previous.next = current;

		previous = current;
	}

	previous.next = root;
	root.prev = previous;

	return root;
}

function triangulateSimplePolygonDCEL( dcel )
{
}
