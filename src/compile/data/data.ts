import {Formula} from '../../transform';
import {keys, Dict, StringSet} from '../../util';
import {VgData, VgTransform} from '../../vega.schema';

import {FacetModel} from './../facet';
import {LayerModel} from './../layer';
import {Model} from './../model';
import {UnitModel} from './../unit';

import {source} from './source';
import {formatParse} from './formatparse';
import {nullFilter} from './nullfilter';
import {filter} from './filter';
import {bin} from './bin';
import {formula} from './formula';
import {nonPositiveFilter} from './nonpositivenullfilter';
import {summary} from './summary';
import {stackScale} from './stackscale';
import {timeUnit} from './timeunit';
import {timeUnitDomain} from './timeunitdomain';
import {colorRank} from './colorrank';


/**
 * Composable component instance of a model's data.
 */
export interface DataComponent {
  source: VgData;

  /** Mapping from field name to primitive data type.  */
  formatParse: Dict<string>;

  /** String set of fields for null filtering */
  nullFilter: Dict<boolean>;

  /** Hashset of a formula object */
  calculate: Dict<Formula>;

  /** Filter test expression */
  filter: string;

  /** Dictionary mapping a bin parameter hash to transforms of the binned field */
  bin: Dict<VgTransform[]>;

  /** Dictionary mapping an output field name (hash) to the time unit transform  */
  timeUnit: Dict<VgTransform>;

  /** String set of fields to be filtered */
  nonPositiveFilter: Dict<boolean>;

  /** Data source for feeding stacked scale. */
  // TODO: need to revise if single VgData is sufficient with layer / concat
  stackScale: VgData;

  /** Dictionary mapping an output field name (hash) to the sort and rank transforms  */
  colorRank: Dict<VgTransform[]>;

  /** String set of time units that need their own data sources for scale domain */
  timeUnitDomain: StringSet;

  /** Array of summary component object for producing summary (aggregate) data source */
  summary: SummaryComponent[];
}

/**
 * Composable component for a model's summary data
 */
export interface SummaryComponent {
  /** Name of the summary data source */
  name: string;

  /** String set for all dimension fields  */
  dimensions: StringSet;

  /** dictionary mapping field name to string set of aggregate ops */
  measures: Dict<StringSet>;
}

// TODO: split this file into multiple files and remove this linter flag
/* tslint:disable:no-use-before-declare */

export function parseUnitData(model: UnitModel): DataComponent {
  return {
    source: source.parseUnit(model),
    formatParse: formatParse.parseUnit(model),
    calculate: formula.parseUnit(model),
    filter: filter.parseUnit(model),
    bin: bin.parseUnit(model),
    timeUnit: timeUnit.parseUnit(model),
    summary: summary.parseUnit(model),
    colorRank: colorRank.parseUnit(model),
    stackScale: stackScale.parseUnit(model),
    nonPositiveFilter: nonPositiveFilter.parseUnit(model),
    nullFilter: nullFilter.parseUnit(model),
    timeUnitDomain: timeUnitDomain.parseUnit(model)
  };
}

export function parseFacetData(model: FacetModel): DataComponent {
  return {
    source: source.parseFacet(model),
    formatParse: formatParse.parseFacet(model),
    calculate: formula.parseFacet(model),
    filter: filter.parseFacet(model),
    bin: bin.parseFacet(model),
    timeUnit: timeUnit.parseFacet(model),
    summary: summary.parseFacet(model),
    colorRank: colorRank.parseFacet(model),
    stackScale: stackScale.parseFacet(model),
    nonPositiveFilter: nonPositiveFilter.parseFacet(model),
    nullFilter: nullFilter.parseFacet(model),
    timeUnitDomain: timeUnitDomain.parseFacet(model)
  };
}

/**
 * Merges data from children up if possible.
 */
export function parseLayerData(model: LayerModel): DataComponent {
  return {
    source: source.parseLayer(model),
    formatParse: formatParse.parseLayer(model),
    calculate: formula.parseLayer(model),
    filter: filter.parseLayer(model),
    bin: bin.parseLayer(model),
    timeUnit: timeUnit.parseLayer(model),
    summary: summary.parseLayer(model),
    colorRank: colorRank.parseLayer(model),
    stackScale: stackScale.parseLayer(model),
    nonPositiveFilter: nonPositiveFilter.parseLayer(model),
    nullFilter: nullFilter.parseLayer(model),
    timeUnitDomain: timeUnitDomain.parseLayer(model)
  };
}


/* tslint:enable:no-use-before-declare */

/**
 * Creates Vega Data array from a given compiled model and append all of them to the given array
 *
 * @param  model
 * @param  data array
 * @return modified data array
 */
export function assembleData(model: Model, data: VgData[]) {
  const component = model.component.data;

  const sourceData = source.assemble(model, component);
  if (sourceData) {
    data.push(sourceData);
  }

  summary.assemble(component, model).forEach(function(summaryData) {
    data.push(summaryData);
  });

  if (data.length > 0) {
    const dataTable = data[data.length - 1];

    // color rank
    const colorRankTransform = colorRank.assemble(component);
    if (colorRankTransform.length > 0) {
      dataTable.transform = (dataTable.transform || []).concat(colorRankTransform);
    }

    // nonPositiveFilter
    const nonPositiveFilterTransform = nonPositiveFilter.assemble(component);
    if (nonPositiveFilterTransform.length > 0) {
      dataTable.transform = (dataTable.transform || []).concat(nonPositiveFilterTransform);
    }
  } else {
    if (keys(component.colorRank).length > 0) {
      throw new Error('Invalid colorRank not merged');
    } else if (keys(component.nonPositiveFilter).length > 0) {
      throw new Error('Invalid nonPositiveFilter not merged');
    }
  }

  // stack
  // TODO: revise if this actually should be an array
  const stackData = stackScale.assemble(component);
  if (stackData) {
    data.push(stackData);
  }

  timeUnitDomain.assemble(component).forEach(function(timeUnitDomainData) {
    data.push(timeUnitDomainData);
  });
  return data;
}
