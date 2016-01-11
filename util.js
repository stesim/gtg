var eps = 0.00001;

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

function findClosestDCELHalfLineIntersection( dcel, a, b, excludeEdges )
{
	var dir = b.clone().sub( a );
	var pvdist = dir.length();
	dir.divideScalar( pvdist );

	var closestIntersection = null;
	var intersectedEdge = null;
	for( var i = 0; i < dcel.edges.length; ++i )
	{
		var edge = dcel.edges[ i ];
		if( excludeEdges && excludeEdges.indexOf( edge ) >= 0 ) { continue; }

		var intersection = extendedLineIntersection(
			a, b, edge.origin.pos, edge.next.origin.pos );

		if( intersection !== null &&
			( closestIntersection === null ||
			  intersection[ 1 ] < closestIntersection[ 1 ] ) &&
			intersection[ 2 ] > -eps && intersection[ 2 ] < ( 1 + eps ) &&
			( intersection[ 1 ] >= eps ||
			  ( intersection[ 1 ] > -eps &&
				( edge.normal().dot( dir ) < 0 &&
				  ( intersection[ 2 ] >= eps ||
					edge.prev.normal().dot( dir ) < 0 ||
					edge.origin.isConvex() ) &&
				  ( intersection[ 2 ] <= ( 1 - eps ) ||
					edge.next.normal().dot( dir ) < 0 ||
					edge.next.origin.isConvex() )
				)
			  )
			)
		  )
		{
			closestIntersection = intersection;
			intersectedEdge = edge;
		}
	}
	return ( closestIntersection !== null ?
		{ edge: intersectedEdge, intersection: closestIntersection } : null );
}