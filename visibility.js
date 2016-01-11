function visibility( dcel, p )
{
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
			if( p.distanceTo( vertices[ i ].pos ) < eps )
			{
				return vertices[ i ];
			}
		}
		return null;
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
			return ( isRight( dn ) ? 2 : ( v.isConvex() ? 1 : 3 ) );
		}
		else if( isOnLine( dn ) )
		{
			return ( isLeft( dp ) ? 3 : ( v.isConvex() ? 1 : 2 ) );
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
		vertices.splice( vertices.indexOf( coincidingVertex ), 1 );

		vertices.sort( sortVertices );

		var u = coincidingVertex.edge.next.origin;
		var v = coincidingVertex.edge.prev.origin;
		if( clampAngle(
			Math.atan2( u.pos.y - p.y, u.pos.x - p.x ) -
			Math.atan2( v.pos.y - p.y, v.pos.x - p.x ) ) < 0 )
		{
			startIndex =
				vertices.indexOf( coincidingVertex.isConvex() ? u : v );
		}
		else
		{
			startIndex =
				vertices.indexOf( coincidingVertex.isConvex() ? v : u );
		}

		visVectors.push( coincidingVertex.pos.clone() );
	}
	else
	{
		vertices.sort( sortVertices );
	}

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

		var intersection = findClosestDCELHalfLineIntersection(
			dcel, p, vertex.pos, [ vertex.edge, vertex.edge.prev ] );
		if( intersection !== null )
		{
			intersection = intersection.intersection[ 0 ];
		}
		var distInterSq = ( intersection !== null ?
			p.distanceToSquared( intersection ) : Infinity );

		if( intersection === null ||
			distInterSq - p.distanceToSquared( vertex.pos ) > eps )
		{
			var c = vertexCase( vertex );
			if( c === 1 )
			{
				visVectors.push( vertex.pos.clone() );
			}
			else
			{
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
