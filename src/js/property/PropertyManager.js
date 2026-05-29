/**
 * PropertyManager.js - Real Estate System
 * Simple property investment with rental income
 */

import gameState from '../core/GameState.js';
import timeManager from '../core/TimeManager.js';
import financeManager from '../finance/FinanceManager.js';
import { PROPERTY_DATABASE, PROPERTY_TIERS } from '../core/databases/PropertyDatabase.js';

class PropertyManager {
    constructor() {
        // Properties are now loaded from PropertyDatabase.js
        this.propertyTypes = PROPERTY_DATABASE;
        this.tiers = PROPERTY_TIERS;

        // Collect rent monthly
        timeManager.onMonth(() => this.collectRent());
    }

    /**
     * Get all property types
     */
    getPropertyTypes() {
        return this.propertyTypes;
    }

    /**
     * Get property type by ID
     */
    getPropertyType(typeId) {
        return this.propertyTypes.find(p => p.id === typeId);
    }

    /**
     * Get player's owned properties
     */
    getOwnedProperties() {
        return gameState.get('properties') || [];
    }

    /**
     * Buy a property
     */
    buyProperty(typeId) {
        const propertyType = this.getPropertyType(typeId);
        if (!propertyType) throw new Error('Tipe properti tidak ditemukan');

        const balance = gameState.getBalance();
        if (balance < propertyType.price) {
            throw new Error('Saldo tidak cukup untuk membeli properti ini');
        }

        // Deduct balance
        gameState.update('player', p => ({
            ...p,
            balance: p.balance - propertyType.price
        }));

        // Add property to owned list
        const properties = this.getOwnedProperties();
        const newProperty = {
            id: Date.now(),
            typeId: propertyType.id,
            name: propertyType.name,
            icon: propertyType.icon,
            price: propertyType.price,
            monthlyRent: propertyType.monthlyRent,
            purchaseDate: {
                day: gameState.get('gameTime.day'),
                month: gameState.get('gameTime.month'),
                year: gameState.get('gameTime.year')
            }
        };

        properties.push(newProperty);
        gameState.set('properties', properties);

        // Record transaction
        financeManager.recordTransaction({
            amount: -propertyType.price,
            category: 'property_purchase',
            description: `Beli ${propertyType.name}`
        });

        gameState.emit('propertyUpdate');
        return newProperty;
    }

    /**
     * Sell a property (90% of purchase price)
     */
    sellProperty(propertyId) {
        const properties = this.getOwnedProperties();
        const propertyIndex = properties.findIndex(p => p.id === propertyId);

        if (propertyIndex === -1) throw new Error('Properti tidak ditemukan');

        const property = properties[propertyIndex];
        const sellPrice = Math.floor(property.price * 0.9); // 90% of purchase price

        // Remove from owned list
        properties.splice(propertyIndex, 1);
        gameState.set('properties', properties);

        // Add money to balance
        gameState.update('player', p => ({
            ...p,
            balance: p.balance + sellPrice
        }));

        // Record transaction
        financeManager.recordTransaction({
            amount: sellPrice,
            category: 'property_sale',
            description: `Jual ${property.name}`
        });

        gameState.emit('propertyUpdate');
        return sellPrice;
    }

    /**
     * Collect monthly rent from all owned properties
     */
    collectRent() {
        const properties = this.getOwnedProperties();
        if (properties.length === 0) return 0;

        const totalRent = this.getTotalMonthlyRent();
        if (totalRent > 0) {
            // Add rent to player balance and record transaction
            financeManager.addIncome(totalRent, 'rental_income', `Sewa Properti (${properties.length} unit)`);

            gameState.emit('rentCollected', { amount: totalRent });
            gameState.emit('propertyIncome', totalRent);
        }

        return totalRent;
    }

    /**
     * Get total monthly rental income
     */
    getTotalMonthlyRent() {
        const properties = this.getOwnedProperties();
        return properties.reduce((sum, p) => sum + (p.monthlyRent || 0), 0);
    }

    /**
     * Get total property value
     */
    getTotalPropertyValue() {
        const properties = this.getOwnedProperties();
        return properties.reduce((sum, p) => sum + p.price, 0);
    }
}

export const propertyManager = new PropertyManager();
export default propertyManager;
