var shaders = {};

function loadShaderSource( id )
{
	return document.getElementById( id ).text;
}

shaders.floor1 = new THREE.ShaderMaterial(
{
	uniforms:
	{
		"fIntensity": { type: "f", value: 1.0 },
		"fLines": { type: "f", value: 42.0 },
		"vecRandomParam": { type: "v2", value: new THREE.Vector2( 0.0, 0.0 ) }
	},

	vertexShader: loadShaderSource( "vs_floor1" ),

	fragmentShader: loadShaderSource( "fs_floor1" )
} );
