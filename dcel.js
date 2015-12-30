function vert2str( v )
{
	return ( "( " + v.pos.x + ", " + v.pos.y + " )" );
}

function lineNormal( a, b )
{
	var r = b.clone().sub( a ).normalize();
	r.set( -r.y, r.x );

	return r;
}

function linePointDistance( a, b, p )
{
	return p.clone().sub( a ).dot( lineNormal( a, b ) );
}

function cross2D( a, b )
{
	return ( a.x * b.y - a.y * b.x );
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

	if( vectors.length < 3 )
	{
		return null;
	}

	if( !checkIfCCW( vectors ) )
	{
		vectors.reverse();
	}

	this.edges.length = 0;
	this.vertices.length = 0;
	this.faces.length = 0;

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

function Face( e )
{
	this.edge = e;

	this.tag = null;
	this.temp = null;
}

Face.prototype.insertDiagonal = function( v1, v2 )
{
	console.log( "inserting diagonal..." );

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

//function triangulateSimplePolygonDCEL( dcel )
//{
//	function isMergeVertex( v )
//	{
////		return ( v.edge.prev.origin.pos.y > v.pos.y &&
////		         v.edge.next.origin.pos.y > v.pos.y &&
////		         v.edge.vector().dot( v.edge.prev.normal() ) < 0 );
//
//		return ( v.temp !== null );
//	}
//
//	function findEdgeLeftOf( v, state )
//	{
//		var fakeEdge = new HalfEdge();
//		fakeEdge.origin = v;
//		fakeEdge.next = new HalfEdge();
//		fakeEdge.next.origin = fakeEdge.origin;
//
//		return state.findClosest( fakeEdge ).left.value;
//	}
//
//	function faceBelow( v )
//	{
//		if( v.edge.next.origin.pos.y < v.pos.y )
//		{
//			return v.edge.face;
//		}
//		else
//		{
//			return v.edge.prev.face;
//		}
//	}
//
//	function handleStartVertex( v, dcel, state )
//	{
//		console.log( "--- start " + vert2str( v ) );
//		//console.log( v.edge.tag + ": " + vert2str( v.edge.origin ) + " -> " + vert2str( v.edge.next.origin ) );
//
//		state.insert( v.edge );
//		v.edge.temp = v;
//	}
//
//	function handleSplitVertex( v, dcel, state )
//	{
//		console.log( "--- split " + vert2str( v ) );
//
//		var e = findEdgeLeftOf( v, state );
//		faceBelow( v ).insertDiagonal( e.temp, v );
//		e.temp = v;
//		var e_ = v.edge;
//		state.insert( e_ );
//		e_.temp = v;
//	}
//
//	function handleEndVertex( v, dcel, state )
//	{
//		console.log( "--- end " + vert2str( v ) );
//
//		var e = v.edge.prev;
//		if( isMergeVertex( e.temp ) )
//		{
//			faceBelow( v ).insertDiagonal( e.temp, v );
//		}
//		state.remove( e );
//	}
//
//	function handleMergeVertex( v, dcel, state )
//	{
//		console.log( "--- merge " + vert2str( v ) );
//
//		var e = v.edge.prev;
//		if( isMergeVertex( e.temp ) )
//		{
//			faceBelow( v ).insertDiagonal( e.temp, v );
//		}
//		state.remove( e );
//
//		var e_ = findEdgeLeftOf( v, state );
//
//		if( isMergeVertex( e_.temp ) )
//		{
//			faceBelow( v ).insertDiagonal( e_.temp, v );
//		}
//		e_.temp = v;
//	}
//
//	function handleRegularVertex( v, dcel, state )
//	{
//		console.log( "--- regular " + vert2str( v ) );
//
//		if( v.pos.y > v.edge.next.origin.pos.y )
//		{
//			var e = v.edge.prev;
//			var e_ = v.edge;
//			if( isMergeVertex( e.temp ) )
//			{
//				faceBelow( v ).insertDiagonal( e.temp, v );
//			}
//			state.remove( e );
//			state.insert( e_ );
//			e_.temp = v;
//		}
//		else
//		{
//			var e = findEdgeLeftOf( v, state );
//
//			if( isMergeVertex( e.temp ) )
//			{
//				faceBelow( v ).insertDiagonal( e.temp, v );
//			}
//			e.temp = v;
//		}
//	}
//
//	var vertices = new Array();
//	
//	var iter = dcel;
//	do
//	{
//		vertices.push( iter.origin );
//
//		iter = iter.next;
//	} while( iter != dcel );
//
//	vertices.sort( function( a, b ) { return ( a.pos.y - b.pos.y ); } );
//
//	state = new BST();
//	state.predicate = function( a, b )
//	{
//		var upper, lower;
//		if( Math.max( a.origin.pos.y, a.next.origin.pos.y ) >
//			Math.max( b.origin.pos.y, b.next.origin.pos.y ) )
//		{
//			upper = a;
//			lower = b;
//		}
//		else
//		{
//			upper = b;
//			lower = a;
//		}
//		var point = ( lower.origin.pos.y > lower.next.origin.pos.y )
//			? lower.origin.pos : lower.next.origin.pos;
//
//		var dist = linePointDistance(
//			upper.origin.pos, upper.next.origin.pos, point );
//
//		if( a == lower )
//		{
//			return ( dist > 0 );
//		}
//		else
//		{
//			return ( dist <= 0 );
//		}
//
//
//
////		var dist = linePointDistance(
////			b.origin.pos, b.next.origin.pos, a.origin.pos );
////		if( Math.abs( dist ) < 0.001 )
////		{
////			dist = linePointDistance(
////				b.origin.pos, b.next.origin.pos, a.next.origin.pos );
////		}
////		return ( dist > 0 );
//	};
//
//	for( var i = vertices.length - 1; i >= 0; --i )
//	{
//		var v = vertices[ i ];
//		var p = v.edge.prev.origin;
//		var n = v.edge.next.origin;
//
//		if( p.pos.y < v.pos.y && n.pos.y < v.pos.y )
//		{
//			if( v.edge.vector().dot( p.edge.normal() ) > 0 )
//			{
//				handleStartVertex( v, dcel, state );
//			}
//			else
//			{
//				handleSplitVertex( v, dcel, state );
//			}
//		}
//		else if( p.pos.y > v.pos.y && n.pos.y > v.pos.y )
//		{
//			if( v.edge.vector().dot( p.edge.normal() ) > 0 )
//			{
//				handleEndVertex( v, dcel, state );
//			}
//			else
//			{
//				v.temp = true;
//				handleMergeVertex( v, dcel, state );
//			}
//		}
//		else
//		{
//			handleRegularVertex( v, dcel, state );
//		}
//
//		state.traverseInOrder( function( node ) { console.log( node.value ); console.log( vert2str( node.value.temp ) + " (" + isMergeVertex( node.value.temp ) + ")" ); } );
//	}
//}
//
//function computeSimplePolygonVisibilityPolygonDCEL( dcel, observer )
//{
//	function isVertexBehindEdge( v, e )
//	{
//		var dist = linePointDistance(
//			e.origin.pos, e.next.origin.pos, v.pos );
//		var n = e.normal();
//		var s = v.pos.clone().sub( observer );
//
//		return ( ( ( dist >= 0 && n.dot( s ) >= 0 ) ||
//			( dist <= 0 && n.dot( s ) <= 0 ) ) );
//	}
//
//	function insertEdgeInState( state, e, startVertex )
//	{
//		var i = 0;
//		while( i < state.length )
//		{
//			if( state[ i ] == e )
//			{
//				return i;
//			}
//			else if( isVertexBehindEdge( startVertex, state[ i ] ) )
//			{
//				break;
//			}
//			else
//			{
//				++i;
//			}
//		}
//		state.splice( i, 0, e );
//		return i;
//	}
//
//	function removeEdgeFromState( state, e )
//	{
//		var i = state.indexOf( e );
//		if( i >= 0 )
//		{
//			state.splice( i, 1 );
//		}
//		return i;
//	}
//
//	function initialize( dcel, observer, state )
//	{
//		var e = dcel;
//
//		// find edge with directly visible origin vertex
//		while( true )
//		{
//			var closerEdge = null;
//			var iter = dcel;
//			do
//			{
//				if( iter == e ) { continue; }
//
//				var intersection = extendedLineIntersection(
//					observer, e.origin.pos,
//					iter.origin.pos, iter.next.origin.pos );
//
//				if( intersection[ 1 ] >= 0.0 && intersection[ 1 ] < 1.0 &&
//					intersection[ 2 ] >= 0.0 && intersection[ 2 ] <= 1.0 )
//				{
//					closeEdge = iter;
//					break;
//				}
//
//				iter = iter.next;
//			} while( iter != dcel );
//
//			if( closerEdge !== null )
//			{
//				e = closerEdge;
//			}
//			else
//			{
//				break;
//			}
//		}
//
//		// initialize state structure
//		var iter = dcel;
//		do
//		{
//			if( iter == e || iter == e.prev ) { continue; }
//
//			var intersection = extendedLineIntersection(
//				observer, e.origin.pos,
//				iter.origin.pos, iter.next.origin.pos );
//
//			if( intersection[ 1 ] >= 0.0 &&
//				intersection[ 2 ] >= 0.0 && intersection[ 2 ] <= 1.0 )
//			{
//				iter.temp = intersection[ 1 ];
//
//				for( var i = 0; i < state.length; ++i )
//				{
//					if( state[ i ].temp > iter.temp )
//					{
//						state.splice( i, 0, iter );
//						break;
//					}
//				}
//			}
//
//			iter = iter.next;
//		} while( iter != dcel );
//
//		var alpha = Math.atan2( e.origin.pos.y, e.origin.pos.x );
//
//		if( Math.atan2( e.next.origin.pos.y, e.next.origin.pos.x ) > alpha )
//		{
//			state.splice( 0, 0, e );
//		}
//		if( Math.atan2( e.prev.origin.pos.y, e.prev.origin.pos.x ) > alpha )
//		{
//			state.splice( 0, 0, e.prev );
//		}
//		
//		return e;
//	}
//
//	if( !dcel.faces[ 0 ].contains( observer ) )
//	{
//		return null;
//	}
//
//	var vertices = new Array();
//	
//	var iter = dcel;
//	do
//	{
//		vertices.push( iter.origin );
//
//		iter = iter.next;
//	} while( iter != dcel );
//
//	vertices.sort(
//		function( a, b )
//		{
//			return ( Math.atan2( a.pos.y, a.pos.x ) -
//			         Math.atan2( b.pos.y, b.pos.x ) );
//		} );
//
//	var state = new Array();
//
//	var initialEdge = initialize( dcel, observer, state );
//	var initialVertexIndex = vertices.indexOf( initialEdge.origin );
//
//	var firstEdge = new HalfEdge();
//	firstEdge.origin = new Vertex( firstEdge, initialEdge.origin.pos.clone() );
//	firstEdge.face = new Face( firstEdge );
//	var lastEdge = firstEdge;
//
//	for( var i = 0; i < vertices.length; ++i )
//	{
//		var v = vertices[ ( i + initialVertexIndex ) % vertices.length ];
//		var vn = v.edge.next.origin;
//		var vp = v.edge.prev.origin;
//
//		var alpha = Math.atan2( v.pos.y, v.pos.x );
//
//		var addEdge = ( Math.atan2( vn.pos.y, vn.pos.x ) > alpha );
//		var addPrevEdge = ( Math.atan2( vp.pos.y, vp.pos.x ) > alpha );
//
//		if( !addEdge )
//		{
//			removeEdgeFromState( state, v.edge );
//		}
//		if( !addPrevEdge )
//		{
//			removeEdgeFromState( state, v.edge.prev );
//		}
//
//		var newPoint;
//		if( ( addEdge && addPrevEdge ) || ( !addEdge && !addPrevEdge ) )
//		{
//			var intersection = extendedLineIntersection( observer, v.pos,
//				state[ 0 ].origin.pos, state[ 0 ].next.origin.pos );
//
//			newPoint = intersection[ 0 ];
//		}
//		else
//		{
//			newPoint = v.pos.clone();
//		}
//		var newEdge = new HalfEdge();
//		newEdge.origin = new Vertex( newEdge, newPoint );
//		newEdge.prev = lastEdge;
//		newEdge.face = lastEdge.face;
//		lastEdge.next = newEdge;
//
//		if( addEdge )
//		{
//			insertEdgeInState( state, v.edge, v );
//		}
//		if( addPrevEdge )
//		{
//			insertEdgeInState( state, v.edge.prev, v );
//		}
//	}
//
//	lastEdge.next = firstEdge;
//	firstEdge.prev = lastEdge;
//
//	return firstEdge;
//}
