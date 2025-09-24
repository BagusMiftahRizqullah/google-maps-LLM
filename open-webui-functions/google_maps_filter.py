"""
title: Google Maps Integration Filter
author: open-webui
author_url: https://github.com/open-webui
funding_url: https://github.com/open-webui
version: 0.1
"""

from pydantic import BaseModel, Field
from typing import Optional
import requests
import json
import re
import os


class Filter:
    class Valves(BaseModel):
        priority: int = Field(
            default=0, description="Priority level for the filter operations."
        )
        max_turns: int = Field(
            default=8, description="Maximum allowable conversation turns for a user."
        )
        maps_api_base_url: str = Field(
            default=os.getenv("MAPS_API_BASE_URL", "http://localhost:3000"), 
            description="Base URL for the Google Maps Node.js backend"
        )
        enable_maps_integration: bool = Field(
            default=True, description="Enable Google Maps integration for location queries"
        )
        pass

    class UserValves(BaseModel):
        max_turns: int = Field(
            default=4, description="Maximum allowable conversation turns for a user."
        )
        enable_maps_for_user: bool = Field(
            default=True, description="Enable Google Maps integration for this user"
        )
        pass

    def __init__(self):
        self.valves = self.Valves()
        
        # Keywords that indicate location-based queries
        self.location_keywords = [
            # English keywords
            'find', 'search', 'locate', 'where', 'near', 'nearby', 'around', 'closest', 'nearest',
            'restaurant', 'coffee', 'shop', 'store', 'hotel', 'gas station', 'bank', 'hospital', 
            'pharmacy', 'mall', 'market',
            # Indonesian keywords
            'cari', 'temukan', 'dimana', 'dekat', 'terdekat', 'sekitar', 'lokasi', 'tempat',
            'restoran', 'rumah makan', 'warung', 'kafe', 'toko', 'hotel', 'spbu', 'bank', 
            'rumah sakit', 'apotek', 'mall', 'pasar'
        ]
        pass

    def create_maps_context(self, maps_data: dict, query: str) -> str:
        """Create formatted context from Google Maps data"""
        formatted_places = maps_data.get("formatted_places", [])
        map_url = maps_data.get("map_url", "")
        directions_url = maps_data.get("directions_url", "")
        
        places_text = "\n\n".join(formatted_places) if formatted_places else "No places found"
        
        return f"""GOOGLE MAPS SEARCH RESULTS for query: "{query}"

FOUND LOCATIONS:
{places_text}

MAP LINKS:
- View on Google Maps: {map_url}
- Get Directions: {directions_url}

Please use this Google Maps data to provide a helpful response about these locations."""

    def enhance_maps_response(self, content: str) -> str:
        """Enhance LLM response with better Google Maps formatting"""
        # Add emoji and better formatting for Google Maps responses
        enhanced = content
        
        # Add map emoji to titles
        enhanced = re.sub(r'(Google Maps|Maps|Lokasi|Location)', r'🗺️ \1', enhanced)
        
        # Add location emoji to addresses
        enhanced = re.sub(r'(Address|Alamat):', r'📍 \1:', enhanced)
        
        # Add star emoji to ratings
        enhanced = re.sub(r'(Rating|⭐)', r'⭐ Rating', enhanced)
        
        # Add direction emoji to direction links
        enhanced = re.sub(r'(Direction|Petunjuk|Arah)', r'🧭 \1', enhanced)
        
        return enhanced

    def is_location_query(self, message: str) -> bool:
        """Check if the message contains location-related keywords"""
        message_lower = message.lower()
        return any(keyword in message_lower for keyword in self.location_keywords)

    def call_maps_backend(self, query: str, __user__: Optional[dict] = None) -> Optional[dict]:
        """Call the Node.js Google Maps backend"""
        try:
            # Always use search endpoint for location queries
            endpoint = f"{self.valves.maps_api_base_url}/api/search"
            payload = {
                "query": query,
                "radius": 5000,
                "type": "restaurant"  # Default type, can be enhanced
            }

            print(f"🗺️ [FILTER] Calling Maps Backend: {endpoint}")
            print(f"📤 [FILTER] Payload: {payload}")

            response = requests.post(
                endpoint,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30
            )

            print(f"📊 [FILTER] Response Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ [FILTER] Maps Backend Response received: {len(str(result))} characters")
                print(f"🔍 [FILTER] Response preview: {str(result)[:200]}...")
                
                # Extract and format place data if available
                if result.get("success") and "data" in result:
                    data = result["data"]
                    places = data.get("places", [])
                    if places:
                        # Create formatted place information
                        place_info = []
                        for place in places[:5]:  # Limit to top 5 results
                            info = f"📍 **{place['name']}**"
                            if place.get('rating'):
                                info += f" (⭐ {place['rating']}/5)"
                            info += f"\n   📍 {place['formatted_address']}"
                            if place.get('price_level'):
                                price_symbols = "💰" * place['price_level']
                                info += f"\n   💰 Price Level: {price_symbols}"
                            
                            # Add website if available
                            if place.get('website'):
                                info += f"\n   🌐 Website: {place['website']}"
                            
                            # Add phone if available
                            if place.get('formatted_phone_number'):
                                info += f"\n   📞 Phone: {place['formatted_phone_number']}"
                            
                            # Add opening hours if available
                            if place.get('opening_hours') and place['opening_hours'].get('open_now') is not None:
                                status = "🟢 Open Now" if place['opening_hours']['open_now'] else "🔴 Closed"
                                info += f"\n   🕒 Status: {status}"
                            
                            place_info.append(info)
                        
                        # Return formatted data with additional info
                        return {
                            "formatted_places": place_info,
                            "map_url": data.get("map_url"),
                            "directions_url": data.get("directions_url"),
                            "center": data.get("center"),
                            "zoom": data.get("zoom"),
                            "raw_data": result
                        }
                
                return result
            else:
                print(f"❌ [FILTER] Maps Backend Error: {response.status_code} - {response.text}")
                return None

        except requests.exceptions.RequestException as e:
            print(f"❌ [FILTER] Network Error calling Maps Backend: {str(e)}")
            return None
        except Exception as e:
            print(f"❌ [FILTER] Unexpected Error calling Maps Backend: {str(e)}")
            return None

    def inlet(self, body: dict, __user__: Optional[dict] = None) -> dict:
        """Pre-process the request before sending to the LLM"""
        print(f"🔍 [FILTER] === INLET CALLED ===")
        print(f"🔍 [FILTER] Filter Name: {__name__}")
        print(f"📥 [FILTER] Body keys: {list(body.keys())}")
        print(f"👤 [FILTER] User: {__user__}")

        # Check conversation turn limits
        if __user__ and __user__.get("role", "admin") in ["user", "admin"]:
            messages = body.get("messages", [])
            user_valves = __user__.get("valves")
            user_max_turns = 4  # Default value
            
            if user_valves and hasattr(user_valves, 'max_turns'):
                user_max_turns = user_valves.max_turns
            
            max_turns = min(user_max_turns, self.valves.max_turns)
            print(f"🔢 [FILTER] Turn check: {len(messages)}/{max_turns}")
            if len(messages) > max_turns:
                raise Exception(
                    f"Conversation turn limit exceeded. Max turns: {max_turns}"
                )

        # Check if Google Maps integration is enabled
        print(f"🔧 [FILTER] Maps integration enabled: {self.valves.enable_maps_integration}")
        if not self.valves.enable_maps_integration:
            print(f"❌ [FILTER] Maps integration disabled globally")
            return body

        user_valves = __user__.get("valves") if __user__ else None
        if user_valves and hasattr(user_valves, 'enable_maps_for_user') and not user_valves.enable_maps_for_user:
            print(f"❌ [FILTER] Maps integration disabled for user")
            return body

        # Get the latest user message
        messages = body.get("messages", [])
        print(f"📨 [FILTER] Total messages: {len(messages)}")
        if not messages:
            print(f"❌ [FILTER] No messages found")
            return body

        latest_message = messages[-1]
        print(f"📝 [FILTER] Latest message role: {latest_message.get('role')}")
        if latest_message.get("role") != "user":
            print(f"❌ [FILTER] Latest message is not from user")
            return body

        user_query = latest_message.get("content", "")
        print(f"💬 [FILTER] User query: '{user_query}'")
        
        # Check if this is a location-based query
        is_location = self.is_location_query(user_query)
        print(f"📍 [FILTER] Is location query: {is_location}")
        
        if is_location:
            print(f"🗺️ [FILTER] Location query detected: {user_query}")
            
            # Call the Google Maps backend
            maps_result = self.call_maps_backend(user_query, __user__)
            
            if maps_result:
                print(f"🧠 [FILTER] Adding Google Maps data for LLM processing")
                
                # Create enhanced system message with Google Maps data
                maps_context = self.create_maps_context(maps_result, user_query)
                
                # Add system message with Google Maps context
                enhanced_messages = [{
                    "role": "system",
                    "content": f"""You are GoogleMapsAI, an intelligent assistant that helps users find locations using Google Maps data.

{maps_context}

Please provide a helpful, conversational response about these locations. Include:
1. A brief summary of what was found
2. Key details about the top locations (name, rating, address)
3. Helpful suggestions or recommendations
4. Map and directions links when relevant

Be natural, friendly, and informative in your response."""
                }] + messages
                
                body["messages"] = enhanced_messages
                
                print(f"✅ [FILTER] Enhanced messages with Google Maps context for LLM")
            else:
                print(f"❌ [FILTER] No maps result received")
        else:
            print(f"ℹ️ [FILTER] Not a location query, skipping maps integration")

        print(f"🔍 [FILTER] === INLET FINISHED ===")
        return body

    def outlet(self, body: dict, __user__: Optional[dict] = None) -> dict:
        """Post-process the LLM response to enhance Google Maps formatting."""
        print(f"🔄 [FILTER] Processing outlet")
        print(f"📤 [FILTER] Body keys: {list(body.keys())}")
        
        # Extract the LLM response content
        response_content = ""
        if "choices" in body and body["choices"]:
            response_content = body["choices"][0].get("message", {}).get("content", "")
        elif "message" in body:
            response_content = body["message"].get("content", "")
        
        if response_content:
            print(f"🧠 [FILTER] Processing LLM response for Google Maps enhancement")
            
            # Enhance the response with better formatting if it contains Google Maps data
            enhanced_content = self.enhance_maps_response(response_content)
            
            # Update the response with enhanced content
            if "choices" in body and body["choices"]:
                body["choices"][0]["message"]["content"] = enhanced_content
                print(f"✅ [FILTER] Enhanced OpenAI format response")
            elif "message" in body:
                body["message"]["content"] = enhanced_content
                print(f"✅ [FILTER] Enhanced message format response")
            
        return body