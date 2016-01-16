function visibility( dcel, p, opt )
{
	if( !opt ) { opt = {}; }
	if( !opt.direction ) { opt.direction = 0; };

	opt.direction = clampAngle( opt.direction );

	function angle( v )
	{
		return clampAngle( Math.atan2( v.y - p.y, v.x - p.x ) - opt.direction );
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

		var dn = linePointDistance( p, v.pos, v.edge.next.origin.pos );
		var dp = linePointDistance( p, v.pos, v.edge.prev.origin.pos );

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

	function sortPredicate( u, v )
	{
		var diff = angle( u.pos ) - angle( v.pos );
		if( isAngleZero( diff ) )
		{
			return ( p.distanceToSquared( u.pos ) -
				p.distanceToSquared( v.pos ) );
		}
		else
		{
			return diff;
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

	function initializeVertexList( vertices, visVectors )
	{
		var coincidingVertex = findCoincidingVertex( vertices, p );
		var pIsOnVertex = ( coincidingVertex !== null );
		var startIndex = 0;
		if( pIsOnVertex )
		{
			vertices.splice( vertices.indexOf( coincidingVertex ), 1 );

			vertices.sort( sortPredicate );

			var u = coincidingVertex.edge.next.origin;
			var v = coincidingVertex.edge.prev.origin;
			if( clampAngle( angle( u.pos ) - angle( v.pos ) ) > 0 )
			{
				startIndex =
					vertices.indexOf( coincidingVertex.isConvex() ? v : u );
			}
			else
			{
				startIndex =
					vertices.indexOf( coincidingVertex.isConvex() ? u : v );
			}
		}
		else
		{
			vertices.sort( sortPredicate );
		}

		if( opt.minAngle || opt.maxAngle || pIsOnVertex )
		{
			visVectors.push( p.clone() );
		}

		return startIndex;
	}

	var visVectors = new Array();

	var vertices = dcel.vertices.slice();
	var face = dcel.faces[ 0 ];

	var startIndex = initializeVertexList( vertices, visVectors );

	var minAngleReached = ( opt.minAngle ? false : true );
	var maxAngleReached = false;
	for( var i = 0; i < vertices.length; ++i )
	{
		if( maxAngleReached ) { break; }

		var vertex = vertices[ ( i + startIndex ) % vertices.length ];
		var alpha = angle( vertex.pos );

		var numCollinear = 0;
		for( var j = i + 1; j < vertices.length; ++j )
		{
			if( isAngleZero( angle( vertices[ j ].pos ) - alpha ) )
			{
				++numCollinear;
			}
			else
			{
				break;
			}
		}

		if( !minAngleReached )
		{
			if( isAngleZero( alpha - opt.minAngle ) )
			{
				minAngleReached = true;
			}
			else if( alpha > opt.minAngle )
			{
				var intersection = findClosestDCELFaceHalfLineIntersection(
					dcel, face, p, new THREE.Vector2(
						Math.cos( opt.direction + opt.minAngle ),
						Math.sin( opt.direction + opt.minAngle ) ).add( p ) );
				intersection = intersection.intersection[ 0 ];

				if( intersection.distanceTo( visVectors[ 0 ] ) >= eps )
				{
					visVectors.push( intersection );
				}

				minAngleReached = true;
			}
			else
			{
				i += numCollinear;
				continue;
			}
		}

		if( opt.maxAngle )
		{
			if( isAngleZero( alpha - opt.maxAngle ) )
			{
				maxAngleReached = true;
			}
			else if( alpha > opt.maxAngle )
			{
				var intersection = findClosestDCELFaceHalfLineIntersection(
					dcel, face, p, new THREE.Vector2(
						Math.cos( opt.direction + opt.maxAngle ),
						Math.sin( opt.direction + opt.maxAngle ) ).add( p ) );
				intersection = intersection.intersection[ 0 ];

				if( intersection.distanceTo( visVectors[ 0 ] ) >= eps )
				{
					visVectors.push( intersection );
				}

				maxAngleReached = true;
				break;
			}
		}

		var intersection = findClosestDCELFaceHalfLineIntersection(
			dcel, face, p, vertex.pos, [ vertex.edge, vertex.edge.prev ] );
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
					if( p.distanceToSquared( vertices[ idx ].pos ) - distInterSq >= eps )
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

	if( opt.maxAngle && minAngleReached && !maxAngleReached )
	{
		var intersection = findClosestDCELFaceHalfLineIntersection(
			dcel, face, p, new THREE.Vector2(
				Math.cos( opt.direction + opt.maxAngle ),
				Math.sin( opt.direction + opt.maxAngle ) ).add( p ) );
		intersection = intersection.intersection[ 0 ];

		if( intersection.distanceTo( visVectors[ 0 ] ) >= eps )
		{
			visVectors.push( intersection );
		}
	}

	return new DCEL().simpleFromVectorList( visVectors, true );
}
