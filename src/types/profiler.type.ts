export interface MarketItem {
    trade_id: string,
    id_member: string,
    member_name: string,
    id_member_to: string,
    member_to_name: string,
    item: string,
    stat: string,
    itemname: string,
    price: string,
    trade_zone: string,
    category: string,
    quantity: string,
    priceper: string,
    deny_private: string
}

export type RawData = Record<string, string>;
export type TradeItem = Record<string, string>;