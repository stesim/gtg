var levels = new Array();

function Level( name, description, budget, guardTypes,
                geometry, pictures, version )
{
	this.name = name;
	this.description = description;
	this.budget = budget;
	this.guardTypes = guardTypes;
	this.geometry = geometry;
	this.pictures = pictures;
	this.version = version;
}
