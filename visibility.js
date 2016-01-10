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

	function findClosestIntersection( dcel, p, v )
	{
		var closestIntersection = null;
		var pvdist = p.distanceTo( v );
		for( var i = 0; i < dcel.edges.length; ++i )
		{
			var edge = dcel.edges[ i ];
			if( edge === v.edge || edge === v.edge.prev ) { continue; }

			var intersection = extendedLineIntersection(
				p, v.pos, edge.origin.pos, edge.next.origin.pos );

			if( intersection !== null &&
				intersection[ 1 ] >= 0.0 &&
				intersection[ 2 ] >= 0.0 && intersection[ 2 ] <= 1.0 &&
				( closestIntersection === null ||
				  intersection[ 1 ] < closestIntersection[ 1 ] ) )
			{
				closestIntersection = intersection;
			}
			else if( intersection === null )
			{
				var dir = v.pos.clone().sub( p ).normalize();

				var proj1 = dir.dot( edge.origin.pos.clone().sub( p ) );
				var proj2 = dir.dot( edge.next.origin.pos.clone().sub( p ) );

				if( proj1 >= proj2 && proj1 > 0 )
				{
					closestIntersection =
					[
						edge.origin.pos.clone(),
						proj1 / pvdist,
						0
					];
				}
				else if( proj2 >= proj1 && proj2 > 0 )
				{
					closestIntersection =
					[
						edge.next.origin.pos.clone(),
						proj1 / pvdist,
						0
					];
				}
			}
		}
		return ( closestIntersection !== null ?
			closestIntersection[ 0 ] : null );
	}

	function findInitialVertex( dcel, sortedVertices, p )
	{
		for( var i = 0; i < sortedVertices.length; ++i )
		{
			var vertex = dcel.vertices[ i ];

			var intersection = findClosestIntersection( dcel, p, vertex );

			if( intersectionFound === null ||
				p.distanceTo( intersection ) > p.distanceTo( vertex.pos ) )
			{
				return i;
			}
		}

		alert( "ERROR!" );
	}

	function vertexCase( v )
	{
		var eps = 0.001;
		function isOnLine( a )
		{
			return ( Math.abs( a ) < 0.001 );
		}
		function isLeft( a )
		{
			return ( a > 0 );
		}
		function isRight( a )
		{
			return ( a < 0 );
		}

		//var s = v.pos.clone().sub( p );
		var vn = v.edge.next.origin.pos;
		var vp = v.edge.prev.origin.pos;

		var dn = linePointDistance( p, v.pos, vn );
		var dp = linePointDistance( p, v.pos, vp );

		if( isOnLine( dp ) )
		{
			return ( isRight( dn ) ? 2 : 1 );
		}
		else if( isOnLine( dn ) )
		{
			return 1;
		}
		else if( ( isLeft( dp ) && isLeft( dn ) ) ||
			( isRight( dp ) && isRight( dn ) ) )
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
			Math.atan2( a.pos.y - p.y, a.pos.x - p.x ) -
			Math.atan2( b.pos.y - p.y, b.pos.x - p.x ) );
		if( Math.abs( diff ) < 0.001 )
		{
			return diff;
		}


	}

	var iter = dcel.edges[ i ];
	var idx = 0;
	do
	{
		iter.origin.temp = idx++;
		iter = iter.next;
	} while( iter !== dcel.edges[ i ] );

	var vertices = dcel.vertices.slice();
	vertices.sort( sortVertices );

	//var initialIndex = findInitialVertex( dcel, vertices, p );

	var visVectors = new Array();
	for( var i = 0; i < vertices.length; ++i )
	{
		//var vertex = vertices[ ( initialIndex + i ) % vertices.length ];
		var vertex = vertices[ i ];

		var v  = vertex.pos.clone().sub( p );
		var vn = vertex.edge.next.origin.pos.clone().sub( p );
		var vp = vertex.edge.prev.origin.pos.clone().sub( p );

		var alpha = angle( v );

		console.log( ( vertex.pos ) );

		var intersection = findClosestIntersection( dcel, p, vertex );
		
		if( ( clampAngle( alpha - angle( vn ) ) > 0 &&
		      clampAngle( alpha - angle( vp ) ) < 0 ) ||
		    ( clampAngle( alpha - angle( vn ) ) < 0 &&
		      clampAngle( alpha - angle( vp ) ) > 0 ) )
		{
			if( intersection === null ||
				p.distanceTo( intersection ) > p.distanceTo( vertex.pos ) )
			{
				console.log( "case 1" );
				visVectors.push( vertex.pos.clone() );
			}
		}
		else
		{
			if( intersection === null )
			{
				alert( "ERROR!" );
			}

			if( p.distanceTo( intersection ) > p.distanceTo( vertex.pos ) )
			{
				console.log( "case 2" );
				if( clampAngle( alpha - angle( vn ) ) < 0 )
				{
					visVectors.push( intersection );
					visVectors.push( vertex.pos.clone() );
				}
				else
				{
					visVectors.push( vertex.pos.clone() );
					visVectors.push( intersection );
				}
			}
		}
	}

	return new DCEL().fromVectorList( visVectors );
}
