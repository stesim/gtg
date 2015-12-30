function triangulateSimplePolygon( dcel )
{
	var vertices = dcel.vertices;

	var points = new Array( 2 * vertices.length );
	for( var i = 0; i < points.length; i += 2 )
	{
		points[ i ]     = vertices[ i / 2 ].pos.x;
		points[ i + 1 ] = vertices[ i / 2 ].pos.y;
	}

	var indices = earcut( points );

	var newVertices = new Array( vertices.length );
	for( var i = 0; i < newVertices.length; ++i )
	{
		newVertices[ i ] = null;
	}
	var vertexEdges = new Array( vertices.length );
	for( var i = 0; i < vertexEdges.length; ++i )
	{
		vertexEdges[ i ] = new Array();
	}

	var res = new DCEL();
	res.vertices = newVertices;

	for( var i = 0; i < indices.length; i += 3 )
	{
		var i1 = indices[ i ];
		var i2 = indices[ i + 1 ];
		var i3 = indices[ i + 2 ];

		var edge1 = new HalfEdge();
		var edge2 = new HalfEdge();
		var edge3 = new HalfEdge();
		var face = new Face( edge1 );

		res.edges.push( edge1 );
		res.edges.push( edge2 );
		res.edges.push( edge3 );
		res.faces.push( face );

		if( newVertices[ i1 ] === null )
		{
			newVertices[ i1 ] =
				new Vertex( edge1, vertices[ i1 ].pos );
			newVertices[ i1 ].temp = i1;
		}
		if( newVertices[ i2 ] === null )
		{
			newVertices[ i2 ] =
				new Vertex( edge2, vertices[ i2 ].pos );
			newVertices[ i2 ].temp = i2;
		}
		if( newVertices[ i3 ] === null )
		{
			newVertices[ i3 ] =
				new Vertex( edge3, vertices[ i3 ].pos );
			newVertices[ i3 ].temp = i3;
		}

		edge1.origin = newVertices[ i1 ];
		edge1.face = face;
		edge1.next = edge2;
		edge1.prev = edge3;
		vertexEdges[ i1 ].push( edge1 );

		edge2.origin = newVertices[ i2 ];
		edge2.face = face;
		edge2.next = edge3;
		edge2.prev = edge1;
		vertexEdges[ i2 ].push( edge2 );

		edge3.origin = newVertices[ i3 ];
		edge3.face = face;
		edge3.next = edge1;
		edge3.prev = edge2;
		vertexEdges[ i3 ].push( edge3 );
	}

	for( var i = 0; i < vertexEdges.length; ++i )
	{
		var edges = vertexEdges[ i ];
		for( var j = 0; j < edges.length; ++j )
		{
			var e = edges[ j ];
			res.edges.push( e );
			if( e.twin !== null )
			{
				continue;
			}

			var nextVertexEdges = vertexEdges[ e.next.origin.temp ];
			for( var k = 0; k < nextVertexEdges.length; ++k )
			{
				if( nextVertexEdges[ k ].next.origin == e.origin )
				{
					e.twin = nextVertexEdges[ k ];
					nextVertexEdges[ k ].twin = e;
				}
			}
		}
	}

	return res;
}
