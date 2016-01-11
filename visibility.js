function visibility( dcel, p )
{
	var eps = 0.00001;

	function angle( p )
	{
		return Math.atan2( p.y, p.x );
	}

	function clampAngle( phi )
	{
		if( phi > Math.PI )
		{
			return ( phi - 2 * Math.PI );
		}
		else if( phi < -Math.PI )
		{
			return ( phi + 2 * Math.PI );
		}
		else
		{
			return phi;
		}
	}

	function findCoincidingVertex( vertices, p )
	{
		for( var i = 0; i < vertices.length; ++i )
		{
			if( p.distanceTo( vertices[ i ] ) < eps )
			{
				return vertices[ i ];
			}
		}
		return null;
	}

	function findClosestIntersection( dcel, p, v )
	{
		var dir = v.pos.clone().sub( p );
		var pvdist = dir.length();
		dir.divideScalar( pvdist );

		var closestIntersection = null;
		for( var i = 0; i < dcel.edges.length; ++i )
		{
			var edge = dcel.edges[ i ];
			if( edge === v.edge || edge === v.edge.prev ) { continue; }

			var intersection = extendedLineIntersection(
				p, v.pos, edge.origin.pos, edge.next.origin.pos );

			if( intersection !== null )
			{
				var sTol = ( ( edge.normal().dot( dir ) > 0 ||
					intersection[ 2 ] < eps ||
					intersection[ 2 ] > ( 1 - eps ) ) ? eps : -eps );

				if( intersection[ 1 ] > sTol &&
					intersection[ 2 ] > -eps &&
					intersection[ 2 ] < ( 1.0 + eps ) &&
					( closestIntersection === null ||
					  intersection[ 1 ] < closestIntersection[ 1 ] ) )
				{
					closestIntersection = intersection;
				}
			}
		}
		return ( closestIntersection !== null ?
			closestIntersection[ 0 ] : null );
	}

	function isConvex( v )
	{
		return ( v.edge.direction().dot( v.edge.prev.normal() ) > 0 );
	}

	function vertexCase( v )
	{
		function isOnLine( a )
		{
			return ( Math.abs( a ) < eps );
		}
		function isLeft( a )
		{
			return ( a > 0 );
		}
		function isRight( a )
		{
			return ( a < 0 );
		}

		var vn = v.edge.next.origin.pos;
		var vp = v.edge.prev.origin.pos;

		var dn = linePointDistance( p, v.pos, vn );
		var dp = linePointDistance( p, v.pos, vp );

		if( isOnLine( dp ) )
		{
			return ( isRight( dn ) ? 2 : ( isConvex( v ) ? 1 : 3 ) );
		}
		else if( isOnLine( dn ) )
		{
			return ( isLeft( dp ) ? 3 : ( isConvex( v ) ? 1 : 2 ) );
		}
		else if( isLeft( dp ) && isLeft( dn ) )
		{
			return 3;
		}
		else if( isRight( dp ) && isRight( dn ) )
		{
			return 2;
		}
		else
		{
			return 1;
		}
	}

	function sortVertices( u, v )
	{
		var diff = clampAngle(
			Math.atan2( u.pos.y - p.y, u.pos.x - p.x ) -
			Math.atan2( v.pos.y - p.y, v.pos.x - p.x ) );
		if( Math.abs( diff ) < eps )
		{
			return ( p.distanceToSquared( u.pos ) -
				p.distanceToSquared( v.pos ) );
		}
		else
		{
			return diff;
		}
	}

	var visVectors = new Array();

	var vertices = dcel.vertices.slice();

	var coincidingVertex = findCoincidingVertex( vertices, p );
	var pIsOnVertex = ( coincidingVertex !== null );
	var startIndex = 0;
	if( pIsOnVertex )
	{
		startIndex = vertices.indexOf( coincidingVertex.edge.next.origin );

		visVectors.push( coincidingVertex.pos.clone() );

		vertices.splice( vertices.indexOf( coincidingVertex ), 1 );
	}

	vertices.sort( sortVertices );

	for( var i = 0; i < vertices.length; ++i )
	{
		var vertex = vertices[ ( i + startIndex ) % vertices.length ];

		var v  = vertex.pos.clone().sub( p );
		var vn = vertex.edge.next.origin.pos.clone().sub( p );
		var vp = vertex.edge.prev.origin.pos.clone().sub( p );

		var alpha = angle( v );

		var numCollinear = 0;
		for( var j = i + 1; j < vertices.length; ++j )
		{
			if( Math.abs( clampAngle( angle( vertices[ j ] ) - alpha ) ) < eps )
			{
				++numCollinear;
			}
			else
			{
				break;
			}
		}

//		console.log( ( vertex.pos ) );
//		console.log( angle( vertex.pos.clone().sub( p ) ) );

		var intersection = findClosestIntersection( dcel, p, vertex );
		var distInterSq = ( intersection !== null ?
			p.distanceToSquared( intersection ) : Infinity );

		if( intersection === null ||
			distInterSq - p.distanceToSquared( vertex.pos ) > eps )
		{
			var c = vertexCase( vertex );
//			console.log( c );
			if( c === 1 )
			{
				visVectors.push( vertex.pos.clone() );
			}
			else
			{
				if( c !== 2 && c !== 3 )
				{
					alert( "ERROR: invalid case (" + c + ")" );
				}

				var stopVertex = null;
				for( var j = 1; j < numCollinear; ++j )
				{
					var idx = ( ( i + j + startIndex ) % vertices.length );
					if( p.distanceToSquared( vertices[ idx ].pos ) - distInterSq > eps )
					{
						break;
					}
					else if( vertexCase( vertices[ idx ] ) !== c )
					{
						stopVertex = vertices[ idx ];
						break;
					}
				}

				if( c === 2 )
				{
					visVectors.push( vertex.pos.clone() );
				}

				if( stopVertex !== null )
				{
					visVectors.push( stopVertex.pos.clone() );
				}
				else
				{
					visVectors.push( intersection );
				}

				if( c === 3 )
				{
					visVectors.push( vertex.pos.clone() );
				}
			}
		}
		i += numCollinear;
	}

	return new DCEL().fromVectorList( visVectors );
}
