using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using backend.Auth; 

namespace backend.Common
{
    [ApiController]
    public abstract class BaseApiController : ControllerBase
    {
        protected string GetUserId()
        {
            var id = User.GetUserId(); // bruker extension method

            if (string.IsNullOrEmpty(id))
                throw new Exception("UserId claim missing");

            return id;
        }
    }
}
