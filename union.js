// poly1 may contain holes and disjoint faces
// poly2 must be simple polygon
function union( poly1, poly2 )
{
	function addVector( vectors, v )
	{
		if( vectors.length >= 2 &&
			arePointsCollinear( vectors[ vectors.length - 2 ],
								vectors[ vectors.length - 1 ],
								v ) )
		{
			vectors[ vectors.length - 1 ].copy( v );
		}
		else
		{
			vectors.push( v.clone() );
		}
	}

	function getJunctionInBound( edge, poly, lowerBound, upperBound )
	{
		var junction = null;
		if( lowerBound )
		{
			var fake = { intersection: [ 0, 0, 0 ] };
			fake.intersection[ poly ] = lowerBound;
			var iter = edge.temp.lowerBound( fake );
			if( iter !== null && iter.data() !== null &&
				( !upperBound ||
				  iter.data().intersection[ poly ] < upperBound ) )
			{
				junction = iter.data();
			}
		}
		else
		{
			junction = edge.temp.min();
		}
		return junction;
	}

	function peekJunction( edge, poly, lowerBound )
	{
		if( edge.temp === null || edge.temp.size <= 0 ) { return null; }

		var junction;
		if( lowerBound )
		{
			junction = getJunctionInBound( edge, poly, lowerBound );
		}
		else
		{
			junction = edge.temp.min();
		}
		return junction;
	}

	function removeJunction( junction )
	{
		junction.edge1.temp.remove( junction );
		junction.edge2.temp.remove( junction );
	}

	function extractJunction( edge, poly, lowerBound )
	{
		var junction = peekJunction( edge, poly, lowerBound );
		if( junction !== null )
		{
			removeJunction( junction );
		}
		return junction;
	}

	function constructJunction( edge1, edge2, intersection )
	{
		var prev1 = ( intersection[ 1 ] < eps ?
			edge1.prev.origin : edge1.origin );
		var next1 = ( intersection[ 1 ] > ( 1 - eps ) ?
			edge1.next.next.origin : edge1.next.origin );

		var prev2 = ( intersection[ 2 ] < eps ?
			edge2.prev.origin : edge2.origin );
		var next2 = ( intersection[ 2 ] > ( 1 - eps ) ?
			edge2.next.next.origin : edge2.next.origin );

		return { intersection: intersection,
			edge1: edge1, prev1: prev1, next1: next1,
			edge2: edge2, prev2: prev2, next2: next2 };
	}

	function findAllJunctions()
	{
		function treePredicate( poly, a, b )
		{
			return ( a.intersection[ poly ] - b.intersection[ poly ] );
		}

		function preventDuplicate( edge, poly, intersection )
		{
			if( intersection[ poly ] < eps )
			{
				if( !edge.origin.temp )
				{
					edge.origin.temp = true;
				}
				else { return true; }
			}
			else if( intersection[ poly ] > ( 1 - eps ) )
			{
				if( !edge.next.origin.temp )
				{
					edge.next.origin.temp = true;
				}
				else { return true; }
			}
			else
			{
				var twin = getJunctionInBound(
					edge,
					poly,
					intersection[ poly ] - eps,
					intersection[ poly ] + eps );

				if( twin !== null ) { return true; }
			}
			return false;
		}

		for( var i = 0; i < poly2.edges.length; ++i )
		{
			poly2.edges[ i ].temp = new RBTree( treePredicate.bind( this, 2 ) );
		}

		for( var i = 0; i < poly1.faces.length; ++i )
		{
			var face = poly1.faces[ i ];
			var start = ( face.tag ? face.edge : face.edge.twin );
			var edge1 = start;
			do
			{
				edge1.temp = new RBTree( treePredicate.bind( this, 1 ) );

				for( var j = 0; j < poly2.edges.length; ++j )
				{
					var edge2 = poly2.edges[ j ];
					var intersection = extendedLineIntersection(
						edge1.origin.pos, edge1.next.origin.pos,
						edge2.origin.pos, edge2.next.origin.pos );

					if( intersection !== null &&
						intersection[ 1 ] > -eps && intersection[ 1 ] < ( 1 + eps ) &&
						intersection[ 2 ] > -eps && intersection[ 2 ] < ( 1 + eps ) )
					{
						var junction = null;
						if( !preventDuplicate( edge1, 1, intersection ) )
						{
							if( junction === null )
							{
								junction = constructJunction(
									edge1, edge2, intersection );
							}
							edge1.temp.insert( junction );
//							console.log( "1" );
//							console.log( junction.intersection[ 0 ] );

							face.temp = true;
						}
						if( !preventDuplicate( edge2, 2, intersection ) )
						{
							if( junction === null )
							{
								junction = constructJunction(
									edge1, edge2, intersection );
							}
							edge2.temp.insert( junction );
//							console.log( "2" );
//							console.log( junction.intersection[ 0 ] );
						}
					}
				}

				edge1 = edge1.next;
			} while( edge1 !== start );
		}
	}

	function findStartJunction( face )
	{
		var start = ( face.tag ? face.edge : face.edge.twin );
		var edge1 = start;
		do
		{
			var junction = peekJunction( edge1 );
			if( junction !== null )
			{
				return junction;
			}
			edge1 = edge1.next;
		} while( edge1 !== start );
		return null;
	}

	poly1.clearTemp();
	poly2.clearTemp();

	// TODO: remove collinear points

	findAllJunctions();

	var faces = new Array();

	for( var i = 0; i < poly1.faces.length; ++i )
	{
		var polyFace = poly1.faces[ i ];
		var start = findStartJunction( polyFace );

		while( start !== null )
		{
			var vectors = new Array();

			var junc = start;
			do
			{
				var juncPos = junc.intersection[ 0 ];
				addVector( vectors, juncPos );

				var next;
				var side = linePointDistance(
					juncPos, junc.next1.pos, junc.next2.pos );
				if( Math.abs( side ) < eps )
				{
					var dist1 = juncPos.distanceToSquared( junc.next1.pos );
					var dist2 = juncPos.distanceToSquared( junc.next2.pos );
					if( polyFace.tag )
					{
						next = ( dist1 > dist2 ? junc.next1 : junc.next2 );
					}
					else
					{
						next = ( dist1 > dist2 ? junc.next2 : junc.next1 );
					}
				}
				else
				{
						next = ( side > 0 ? junc.next1 : junc.next2 );
				}

				var poly = ( next === junc.next1 ? 1 : 2 );

				var edge = ( poly === 1 && !next.edge.face.tag ?
					next.edge.twin : next.edge.prev );

				var previous;
				if( edge === junc.edge1 )
				{
					previous = junc.intersection[ 1 ];
				}
				else if( edge === junc.edge2 )
				{
					previous = junc.intersection[ 2 ];
				}
				else
				{
					previous = undefined;
				}

				junc = extractJunction( edge, poly, previous + eps );
				while( junc === null )
				{
					addVector( vectors, next.pos );

					edge = edge.next;
					next = edge.next.origin;

					junc = extractJunction( edge, poly );
				}
			} while( junc.intersection[ 0 ].distanceTo( start.intersection[ 0 ] ) >= eps );

			while( vectors.length >= 3 &&
				( arePointsCollinear( vectors[ vectors.length - 2 ],
									  vectors[ vectors.length - 1 ],
									  vectors[ 0 ] ) ||
				  arePointsCollinear( vectors[ vectors.length - 1 ],
									  vectors[ 0 ],
									  vectors[ 1 ] ) ) )
			{
				vectors[ 0 ].copy( vectors.pop() );
			}

			faces.push( vectors );

			start = findStartJunction( polyFace );
		}
	}

	var poly2Added = ( faces.length > 0 );

	for( var i = 0; i < poly1.faces.length; ++i )
	{
		var polyFace = poly1.faces[ i ];
		if( polyFace.temp ) { continue; }

		if( !poly2.isPointInFace( polyFace.edge.origin.pos, poly2.faces[ 0 ] ) )
		{
			var face = new Array();
			var start = ( polyFace.tag ? polyFace.edge : polyFace.edge.twin );
			var iter = start;
			do
			{
				face.push( iter.origin.pos );
				iter = iter.next;
			} while( iter !== start );
			faces.push( face );
		}
		else if( !poly2Added && polyFace.tag &&
			poly1.isPointInFace( poly2.vertices[ 0 ].pos, polyFace ) )
		{
			poly2Added = true;
		}
	}

	if( !poly2Added )
	{
		var face = new Array();
		var iter = poly2.edges[ 0 ];
		do
		{
			face.push( iter.origin.pos );
			iter = iter.next;
		} while( iter !== poly2.edges[ 0 ] );
		faces.push( face );

		poly2Added = true;
	}

	var areas = new Array( faces.length );
	for( var i = 0; i < areas.length; ++i )
	{
		areas[ i ] = pointListArea( faces[ i ] );
	}

	var dcel = new DCEL();
	for( var i = 0; i < faces.length; ++i )
	{
		if( areas[ i ] > 0 )
		{
			dcel.addDisjointFace( faces[ i ] );
		}
	}
	for( var i = 0; i < faces.length; ++i )
	{
		if( areas[ i ] < 0 )
		{
			for( var j = 0; j < dcel.faces.length; ++j )
			{
				if( dcel.faces[ j ].tag &&
					dcel.isPointInFace( faces[ i ][ 0 ], dcel.faces[ j ] ) )
				{
					dcel.addHole( dcel.faces[ j ], faces[ i ] );
				}
			}
		}
	}

	poly1.clearTemp();
	poly2.clearTemp();

	return dcel;
}
