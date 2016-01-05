function intersectSimplePolygonsDCEL( poly1, poly2 )
{
	var vecList1 = new Array( poly1.vertices.length );
	for( var i = 0; i < poly1.vertices.length; ++i )
	{
		vecList1[ i ] = poly1.vertices[ i ].pos.clone();
	}

	var vecList2 = new Array( poly2.vertices.length );
	for( var i = 0; i < poly2.vertices.length; ++i )
	{
		vecList2[ i ] = poly2.vertices[ i ].pos.clone();
	}

	var intersection = intersectionPolygons( vecList1, vecList2 );
	for( var i = 0; i < intersection.length; ++i )
	{
		intersection[ i ] = new THREE.Vector2(
			intersection[ i ].x, intersection[ i ].y );
	}

	return new DCEL().fromVectorList( intersection );
}
