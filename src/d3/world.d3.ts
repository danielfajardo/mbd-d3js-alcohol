import { select, mouse } from "d3-selection";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { scaleSqrt } from "d3-scale";
import { interpolateBuGn } from "d3-scale-chromatic";
import { json } from "d3";
import { FeatureCollection, Geometry, Feature } from "geojson";

// Configuration for the SVG with the viewBox

const width = 960;
const height = 460;
const padding = 20;

const card = select("#root")
    .append("div")
    .attr("class", "card");

const svg = card
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `${-padding} ${-padding} ${width + 2 * padding} ${height + 2 * padding}`);

const tooltip = select("#root")
    .append("div")
    .style("display", "none")
    .style("position", "absolute")
    .style("padding", "10px")
    .style("border-radius", "3px")
    .style("background-color", "black")
    .style("color", "white")
    .style("opacity", "0.7");

// Create projection for the countries

const countriesGroup = svg
    .append("g");

const projection = geoNaturalEarth1()
    .translate([width / 2, height / 2]);

const pathCreator = geoPath()
    .projection(projection);

// Data load

Promise.all([
    json(require("../data/countries.geojson")),
    json(require("../data/drinks.json"))
]).then(onDataReady as any);

// Interfaces for the data

interface CountryProps {
    name: string;
};

interface drinksRecord {
    country: string;
    beer_servings: number;
    spirit_servings: number;
    wine_servings: number;
    total_litres_of_pure_alcohol: number;
};

function onDataReady([countries, drinks]: [FeatureCollection<Geometry, CountryProps>, drinksRecord[]]) {

    // Create a nested dictionary with countries as key

    const drinksMap = drinks
        .reduce(
            (acc, record) => {
                const dictionary = {};
                const litres = Number(record.total_litres_of_pure_alcohol)
                dictionary["litres"] = litres;
                dictionary["beer"] = Number(record.beer_servings);
                dictionary["spirit"] = Number(record.spirit_servings);
                dictionary["wine"] = Number(record.wine_servings);
                acc[record.country.toUpperCase()] = dictionary;
                if (litres > acc.max) {
                    acc.max = litres
                }
                return acc;
            }, { max: 0 }
        );

    // Setting scale based of maximum 

    const drinksScale = scaleSqrt()
        .domain([0, drinksMap.max])
        .range([0.1, 1]);

    const colorScale = (drinks: number) => interpolateBuGn(drinksScale(drinks));

    const isDataAvailable = (d) => {
        return typeof drinksMap[d.toUpperCase()] !== "undefined" ? true : false;
    }

    // Getter for the dictionary

    const getAttribute = (data, attribute) => {
        const avaialble = isDataAvailable(data)
        return avaialble ? drinksMap[data.toUpperCase()][attribute] : 0;
    };

    // Adding data to the map

    countriesGroup.selectAll("path")
        .data(countries.features, (d: Feature<Geometry, CountryProps>) => d.properties.name)
        .enter()
        .append("path")
        .attr("d", pathCreator)
        .attr("fill", d => colorScale(getAttribute(d.properties.name, "litres")))
        .style("stroke", "white")
        .style("stroke-width", "0.5px")
        .style("opacity", 0.8)
        .on("mouseenter", onMouseEnter)
        .on("mousemove", onMouseMove)
        .on("mouseleave", onMouseLeave);

    function onMouseEnter(d: Feature<Geometry, CountryProps>) {
        const prueba = d.properties.name.toUpperCase() in drinksMap ? true : false
        if (prueba) {
            tooltip
                .style("display", "block")
                .html(`
                <p><b>Country</b>: ${d.properties.name}</p>
                <p><b>Total litres pure alcohol</b>: ${getAttribute(d.properties.name, "litres")}</p>
                <p><b>Beer servings</b>: ${getAttribute(d.properties.name, "beer")}</p>
                <p><b>Wine servings</b>: ${getAttribute(d.properties.name, "wine")}</p>
                <p><b>Spirit servings</b>: ${getAttribute(d.properties.name, "spirit")}</p>
              `);
        } else {
            tooltip
                .style("display", "block")
                .html(`
                <p><b>Country</b>: ${d.properties.name}</p>
                <p>Data not avaialble</p>
              `);
        }


        select(this)
            .raise()  // To be able to see the stroke width change.
            .transition()
            .ease(Math.sqrt)
            .duration(400)
            .style("opacity", 1)
            .style("stroke", "orange")
            .style("stroke-width", "1.5px");
    };

    function onMouseMove() {
        const [mx, my] = mouse(document.body);

        tooltip
            .style("left", `${mx + 10}px`)
            .style("top", `${my + 10}px`);
    };

    function onMouseLeave() {
        tooltip
            .style("display", "none");

        select(this)
            .transition()
            .duration(500)
            .style("opacity", 0.8)
            .style("stroke", "white")
            .style("stroke-width", "0.5px");
    }
};



